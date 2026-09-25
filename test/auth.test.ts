import assert from "node:assert/strict"
import test from "node:test"

import { OpenCodeCredentialSource } from "../src/auth/opencode.js"
import { UsageError } from "../src/domain.js"

test("reads OAuth credentials from OPENCODE_AUTH_CONTENT", async () => {
  const expires = Date.now() + 60_000
  const source = new OpenCodeCredentialSource({
    OPENCODE_AUTH_CONTENT: JSON.stringify({
      openai: {
        type: "oauth",
        access: "fake-access",
        accountId: "fake-account",
        expires,
      },
    }),
  })

  assert.deepEqual(await source.getOAuth("openai"), {
    access: "fake-access",
    accountID: "fake-account",
    expires,
  })
})

test("rejects expired and non-OAuth credentials without exposing tokens", async () => {
  const expired = new OpenCodeCredentialSource({
    OPENCODE_AUTH_CONTENT: JSON.stringify({
      openai: { type: "oauth", access: "do-not-leak", expires: Date.now() - 1 },
    }),
  })
  const apiKey = new OpenCodeCredentialSource({
    OPENCODE_AUTH_CONTENT: JSON.stringify({ openai: { type: "api", key: "do-not-leak" } }),
  })

  await assert.rejects(expired.getOAuth("openai"), (error: unknown) => {
    return error instanceof UsageError && error.code === "auth_expired" && !error.message.includes("do-not-leak")
  })
  await assert.rejects(apiKey.getOAuth("openai"), (error: unknown) => {
    return error instanceof UsageError && error.code === "auth_unsupported" && !error.message.includes("do-not-leak")
  })
})
