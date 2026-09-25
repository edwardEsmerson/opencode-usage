import assert from "node:assert/strict"
import test from "node:test"

import { OPENAI_USAGE_URL, OpenAIUsageAdapter, parseOpenAIUsage } from "../src/adapters/openai.js"
import { UsageError } from "../src/domain.js"

test("parses and orders OpenAI windows by duration", () => {
  const snapshot = parseOpenAIUsage(
    {
      account_id: "account",
      plan_type: "plus",
      rate_limit: {
        primary_window: {
          used_percent: 12,
          reset_at: 2_000,
          limit_window_seconds: 604_800,
        },
        secondary_window: {
          used_percent: 45.5,
          reset_at: 1_000,
          limit_window_seconds: 18_000,
        },
      },
    },
    "gpt-5",
    500,
  )

  assert.equal(snapshot.providerID, "openai")
  assert.equal(snapshot.modelID, "gpt-5")
  assert.equal(snapshot.plan, "plus")
  assert.deepEqual(
    snapshot.windows.map((window) => [window.role, window.usedPercent, window.resetAt]),
    [
      ["short", 45.5, 1_000_000],
      ["weekly", 12, 2_000_000],
    ],
  )
})

test("keeps valid additional limits and ignores malformed entries", () => {
  const snapshot = parseOpenAIUsage({
    rate_limit: {
      primary_window: { used_percent: 5, limit_window_seconds: 18_000 },
    },
    additional_rate_limits: [
      null,
      { limit_name: "Code review", rate_limit: { primary_window: { used_percent: 25 } } },
      { rate_limit: { primary_window: { used_percent: "bad" } } },
    ],
  })

  assert.equal(snapshot.windows.length, 2)
  assert.equal(snapshot.windows[1]?.label, "Code review")
})

test("rejects responses without recognizable windows", () => {
  assert.throws(
    () => parseOpenAIUsage({ rate_limit: { primary_window: { used_percent: "unknown" } } }),
    (error: unknown) => error instanceof UsageError && error.code === "response_unsupported",
  )
})

test("adapter sends only the required authenticated usage request", async () => {
  let requestURL = ""
  let requestInit: RequestInit | undefined
  const adapter = new OpenAIUsageAdapter(
    {
      async getOAuth() {
        return { access: "fake-access", accountID: "fake-account" }
      },
    },
    async (input, init) => {
      requestURL = String(input)
      requestInit = init
      return Response.json({
        rate_limit: { primary_window: { used_percent: 10, limit_window_seconds: 18_000 } },
      })
    },
  )

  await adapter.fetch({ providerID: "openai", modelID: "gpt-5" })
  assert.equal(requestURL, OPENAI_USAGE_URL)
  assert.equal(requestInit?.method, "GET")
  assert.deepEqual(requestInit?.headers, {
    Authorization: "Bearer fake-access",
    Accept: "application/json",
    "User-Agent": "opencode-usage/0.1.0",
    "ChatGPT-Account-Id": "fake-account",
  })
})

test("adapter maps authentication and rate-limit failures", async () => {
  const credentials = { async getOAuth() { return { access: "fake-access" } } }
  const unauthorized = new OpenAIUsageAdapter(credentials, async () => new Response(null, { status: 401 }))
  const limited = new OpenAIUsageAdapter(credentials, async () => new Response(null, { status: 429 }))

  await assert.rejects(unauthorized.fetch({ providerID: "openai" }), (error: unknown) => {
    return error instanceof UsageError && error.code === "auth_expired" && !error.message.includes("fake-access")
  })
  await assert.rejects(limited.fetch({ providerID: "openai" }), (error: unknown) => {
    return error instanceof UsageError && error.code === "rate_limited"
  })
})
