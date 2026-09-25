import { OpenAIUsageAdapter } from "./adapters/openai.js"
import { OpenCodeCredentialSource } from "./auth/opencode.js"
import { UsageError, type UsageAdapter, type UsageFetchContext, type UsageSnapshot } from "./domain.js"

type CacheEntry = {
  cachedAt: number
  expiresAt: number
  snapshot: UsageSnapshot
}

export type UsageGetOptions = {
  force?: boolean
}

export class UsageService {
  private readonly cache = new Map<string, CacheEntry>()
  private readonly inFlight = new Map<string, Promise<UsageSnapshot>>()

  constructor(
    private readonly adapters: UsageAdapter[],
    private readonly cacheTtlMs = 15_000,
    private readonly now: () => number = Date.now,
  ) {}

  private adapter(context: UsageFetchContext): UsageAdapter | undefined {
    return this.adapters.find((candidate) => candidate.supports(context))
  }

  private key(context: UsageFetchContext, adapter: UsageAdapter): string {
    return adapter.cacheKey?.(context) || `${context.providerID}/${context.modelID || "*"}`
  }

  private forTarget(snapshot: UsageSnapshot, context: UsageFetchContext): UsageSnapshot {
    if (snapshot.modelID === context.modelID) return snapshot
    return { ...snapshot, modelID: context.modelID }
  }

  peek(context: UsageFetchContext, maxAgeMs = Number.POSITIVE_INFINITY): UsageSnapshot | undefined {
    const adapter = this.adapter(context)
    if (!adapter) return undefined
    const cached = this.cache.get(this.key(context, adapter))
    if (!cached || this.now() - cached.cachedAt > maxAgeMs) return undefined
    return this.forTarget(cached.snapshot, context)
  }

  async get(context: UsageFetchContext, options: UsageGetOptions = {}): Promise<UsageSnapshot> {
    const adapter = this.adapter(context)
    if (!adapter) {
      throw new UsageError(
        "provider_unsupported",
        `Usage limits are not available for ${context.providerID} yet. The current plugin supports OpenAI.`,
      )
    }

    const key = this.key(context, adapter)
    const cached = this.cache.get(key)
    if (!options.force && cached && cached.expiresAt > this.now()) return this.forTarget(cached.snapshot, context)

    const pending = this.inFlight.get(key)
    if (pending) return pending.then((snapshot) => this.forTarget(snapshot, context))

    const request = adapter.fetch(context).then((snapshot) => {
      const cachedAt = this.now()
      this.cache.set(key, { snapshot, cachedAt, expiresAt: cachedAt + this.cacheTtlMs })
      return snapshot
    })
    this.inFlight.set(key, request)
    try {
      return this.forTarget(await request, context)
    } finally {
      this.inFlight.delete(key)
    }
  }
}

export function createUsageService(): UsageService {
  const credentials = new OpenCodeCredentialSource()
  return new UsageService([new OpenAIUsageAdapter(credentials)])
}
