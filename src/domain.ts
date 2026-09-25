export type UsageWindowRole = "short" | "weekly" | "other"

export type UsageWindow = {
  id: string
  label: string
  role: UsageWindowRole
  usedPercent: number
  resetAt?: number
  durationSeconds?: number
}

export type UsageSnapshot = {
  providerID: string
  modelID?: string
  accountID?: string
  plan?: string
  windows: UsageWindow[]
  fetchedAt: number
}

export type UsageTarget = {
  providerID: string
  modelID?: string
}

export type UsageFetchContext = UsageTarget & {
  signal?: AbortSignal
}

export interface UsageAdapter {
  supports(target: UsageTarget): boolean
  cacheKey?(target: UsageTarget): string
  fetch(context: UsageFetchContext): Promise<UsageSnapshot>
}

export type UsageErrorCode =
  | "auth_missing"
  | "auth_expired"
  | "auth_unsupported"
  | "provider_unsupported"
  | "request_failed"
  | "rate_limited"
  | "response_unsupported"

export class UsageError extends Error {
  readonly code: UsageErrorCode

  constructor(code: UsageErrorCode, message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "UsageError"
    this.code = code
  }
}

export function publicErrorMessage(error: unknown): string {
  if (error instanceof UsageError) return error.message
  if (error instanceof Error && error.name === "AbortError") return "The usage request was cancelled."
  return "Unable to load usage right now. Try again shortly."
}
