import type { CredentialSource } from "../auth/opencode.js"
import {
  UsageError,
  type UsageAdapter,
  type UsageFetchContext,
  type UsageSnapshot,
  type UsageWindow,
  type UsageWindowRole,
} from "../domain.js"

export const OPENAI_USAGE_URL = "https://chatgpt.com/backend-api/wham/usage"

type Fetch = typeof globalThis.fetch

function record(value: unknown): Record<string, unknown> | undefined {
  if (!value || typeof value !== "object" || Array.isArray(value)) return undefined
  return value as Record<string, unknown>
}

function finite(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined
}

function classify(durationSeconds: number | undefined): UsageWindowRole {
  if (durationSeconds !== undefined && durationSeconds >= 6 * 24 * 60 * 60 && durationSeconds <= 8 * 24 * 60 * 60) {
    return "weekly"
  }
  if (durationSeconds !== undefined && durationSeconds > 0 && durationSeconds <= 24 * 60 * 60) return "short"
  return "other"
}

function durationLabel(seconds: number | undefined): string {
  if (!seconds) return "Additional limit"
  if (seconds % (24 * 60 * 60) === 0) return `${seconds / (24 * 60 * 60)}-day limit`
  if (seconds % (60 * 60) === 0) return `${seconds / (60 * 60)}-hour limit`
  return "Additional limit"
}

function parseWindow(value: unknown, id: string, preferredLabel?: string): UsageWindow | undefined {
  const input = record(value)
  if (!input) return undefined
  const usedPercent = finite(input.used_percent)
  if (usedPercent === undefined) return undefined
  const durationSeconds = finite(input.limit_window_seconds)
  const resetSeconds = finite(input.reset_at)
  const role = classify(durationSeconds)
  const label = preferredLabel || (role === "short" ? "Current session" : role === "weekly" ? "Weekly limit" : durationLabel(durationSeconds))

  return {
    id,
    label,
    role,
    usedPercent,
    durationSeconds,
    resetAt: resetSeconds === undefined ? undefined : resetSeconds * 1000,
  }
}

export function parseOpenAIUsage(value: unknown, modelID?: string, now = Date.now()): UsageSnapshot {
  const input = record(value)
  const rateLimit = record(input?.rate_limit)
  const windows = [
    parseWindow(rateLimit?.primary_window, "primary"),
    parseWindow(rateLimit?.secondary_window, "secondary"),
  ].filter((window): window is UsageWindow => Boolean(window))

  const additional = input?.additional_rate_limits
  if (Array.isArray(additional)) {
    for (const [index, item] of additional.entries()) {
      const limit = record(item)
      if (!limit) continue
      const nested = record(limit.rate_limit)
      const rawName = limit.limit_name ?? limit.metered_feature
      const name = typeof rawName === "string" && rawName.trim() ? rawName.trim() : undefined
      const primary = parseWindow(nested?.primary_window, `additional-${index}-primary`, name)
      const secondary = parseWindow(nested?.secondary_window, `additional-${index}-secondary`, name)
      if (primary) windows.push(primary)
      if (secondary) windows.push(secondary)
    }
  }

  if (windows.length === 0) {
    throw new UsageError(
      "response_unsupported",
      "OpenAI returned an unsupported usage response. The usage endpoint may have changed.",
    )
  }

  const order: Record<UsageWindowRole, number> = { short: 0, weekly: 1, other: 2 }
  windows.sort((left, right) => order[left.role] - order[right.role])

  return {
    providerID: "openai",
    modelID,
    accountID: typeof input?.account_id === "string" ? input.account_id : undefined,
    plan: typeof input?.plan_type === "string" ? input.plan_type : undefined,
    windows,
    fetchedAt: now,
  }
}

export class OpenAIUsageAdapter implements UsageAdapter {
  constructor(
    private readonly credentials: CredentialSource,
    private readonly request: Fetch = globalThis.fetch,
    private readonly timeoutMs = 10_000,
  ) {}

  supports(target: UsageFetchContext): boolean {
    return target.providerID === "openai"
  }

  cacheKey(): string {
    return "openai/account"
  }

  async fetch(context: UsageFetchContext): Promise<UsageSnapshot> {
    const credential = await this.credentials.getOAuth("openai")
    const headers: Record<string, string> = {
      Authorization: `Bearer ${credential.access}`,
      Accept: "application/json",
      "User-Agent": "opencode-usage/0.1.0",
    }
    if (credential.accountID) headers["ChatGPT-Account-Id"] = credential.accountID

    const timeout = AbortSignal.timeout(this.timeoutMs)
    const signal = context.signal ? AbortSignal.any([context.signal, timeout]) : timeout
    let response: Response
    try {
      response = await this.request(OPENAI_USAGE_URL, { method: "GET", headers, signal })
    } catch (error) {
      if (context.signal?.aborted) throw error
      throw new UsageError("request_failed", "Could not reach OpenAI's usage service. Try again shortly.", {
        cause: error,
      })
    }

    if (response.status === 401 || response.status === 403) {
      throw new UsageError("auth_expired", "OpenAI rejected the saved session. Reconnect it with /connect.")
    }
    if (response.status === 429) {
      throw new UsageError("rate_limited", "OpenAI's usage service is temporarily rate limited. Try again shortly.")
    }
    if (!response.ok) {
      throw new UsageError("request_failed", `OpenAI's usage service returned HTTP ${response.status}.`)
    }

    let body: unknown
    try {
      body = await response.json()
    } catch (error) {
      throw new UsageError("response_unsupported", "OpenAI returned an invalid usage response.", { cause: error })
    }
    return parseOpenAIUsage(body, context.modelID)
  }
}
