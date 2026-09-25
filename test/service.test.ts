import assert from "node:assert/strict"
import test from "node:test"

import { UsageError, type UsageAdapter, type UsageSnapshot } from "../src/domain.js"
import { UsageService } from "../src/service.js"

test("selects an adapter and caches the normalized snapshot", async () => {
  let calls = 0
  const snapshot: UsageSnapshot = {
    providerID: "example",
    windows: [],
    fetchedAt: Date.now(),
  }
  const adapter: UsageAdapter = {
    supports: (target) => target.providerID === "example",
    async fetch() {
      calls += 1
      return snapshot
    },
  }
  const service = new UsageService([adapter], 60_000)

  assert.equal(await service.get({ providerID: "example" }), snapshot)
  assert.equal(await service.get({ providerID: "example" }), snapshot)
  assert.equal(calls, 1)
})

test("serves stale values immediately while allowing a forced refresh", async () => {
  let now = 1_000
  let calls = 0
  const adapter: UsageAdapter = {
    supports: () => true,
    async fetch(context) {
      calls += 1
      return {
        providerID: context.providerID,
        windows: [],
        fetchedAt: now,
        plan: `version-${calls}`,
      }
    },
  }
  const service = new UsageService([adapter], 100, () => now)
  const target = { providerID: "example" }

  const first = await service.get(target)
  now += 500
  assert.equal(service.peek(target)?.plan, "version-1")
  assert.equal(service.peek(target, 100), undefined)

  const refreshed = await service.get(target, { force: true })
  assert.equal(first.plan, "version-1")
  assert.equal(refreshed.plan, "version-2")
  assert.equal(service.peek(target)?.plan, "version-2")
})

test("deduplicates concurrent provider refreshes", async () => {
  let calls = 0
  let release: (() => void) | undefined
  const wait = new Promise<void>((resolve) => {
    release = resolve
  })
  const adapter: UsageAdapter = {
    supports: () => true,
    async fetch(context) {
      calls += 1
      await wait
      return { providerID: context.providerID, windows: [], fetchedAt: Date.now() }
    },
  }
  const service = new UsageService([adapter])
  const first = service.get({ providerID: "example" }, { force: true })
  const second = service.get({ providerID: "example" }, { force: true })
  release?.()

  assert.equal(await first, await second)
  assert.equal(calls, 1)
})

test("supports provider-wide caches while preserving the current model label", async () => {
  let calls = 0
  const adapter: UsageAdapter = {
    supports: () => true,
    cacheKey: () => "example/account",
    async fetch(context) {
      calls += 1
      return { providerID: context.providerID, modelID: context.modelID, windows: [], fetchedAt: Date.now() }
    },
  }
  const service = new UsageService([adapter], 60_000)
  await service.get({ providerID: "example", modelID: "model-a" })

  const second = await service.get({ providerID: "example", modelID: "model-b" })
  assert.equal(second.modelID, "model-b")
  assert.equal(service.peek({ providerID: "example", modelID: "model-c" })?.modelID, "model-c")
  assert.equal(calls, 1)
})

test("reports providers without an adapter", async () => {
  const service = new UsageService([])
  await assert.rejects(service.get({ providerID: "anthropic" }), (error: unknown) => {
    return error instanceof UsageError && error.code === "provider_unsupported"
  })
})
