import assert from "node:assert/strict"
import test from "node:test"

import { formatRelativeReset, formatUsageText, textProgressBar } from "../src/format/text.js"
import { targetFromConfig, targetFromMessages } from "../src/model.js"

test("formats compact, deterministic tool output", () => {
  const now = 1_000_000
  const text = formatUsageText(
    {
      providerID: "openai",
      modelID: "gpt-5",
      plan: "plus",
      fetchedAt: now,
      windows: [
        {
          id: "short",
          label: "Current session",
          role: "short",
          usedPercent: 25,
          resetAt: now + 90 * 60_000,
        },
      ],
    },
    now,
  )

  assert.match(text, /Usage - OpenAI \| plus \| gpt-5/)
  assert.match(text, /Current session: 25% used \(75% left\)/)
  assert.match(text, /Resets in 1h 30m/)
  assert.equal(textProgressBar(50, 10), "[#####-----]")
  assert.equal(formatRelativeReset(now + 1, now), "Resets in less than a minute")
})

test("resolves current models from messages and config", () => {
  assert.deepEqual(
    targetFromMessages([
      { role: "user", model: { providerID: "openai", modelID: "old" } },
      { role: "assistant" },
      { role: "user", model: { providerID: "anthropic", modelID: "claude" } },
    ]),
    { providerID: "anthropic", modelID: "claude" },
  )
  assert.deepEqual(targetFromConfig("openai/gpt-5"), { providerID: "openai", modelID: "gpt-5" })
  assert.equal(targetFromConfig("invalid"), undefined)
})
