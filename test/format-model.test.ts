import assert from "node:assert/strict"
import test from "node:test"

import { clampPercent, formatPercent, formatRelativeReset } from "../src/format/text.js"
import { targetFromConfig } from "../src/model.js"

test("formats usage percentages and relative resets for the dialog", () => {
  const now = 1_000_000
  assert.equal(clampPercent(-10), 0)
  assert.equal(clampPercent(120), 100)
  assert.equal(formatPercent(25), "25")
  assert.equal(formatPercent(25.25), "25.3")
  assert.equal(formatRelativeReset(now + 90 * 60_000, now), "Resets in 1h 30m")
  assert.equal(formatRelativeReset(now + 1, now), "Resets in less than a minute")
  assert.equal(formatRelativeReset(undefined, now), "Reset time unavailable")
})

test("resolves models from config without truncating model IDs containing slashes", () => {
  assert.deepEqual(targetFromConfig("openai/gpt-5"), { providerID: "openai", modelID: "gpt-5" })
  assert.equal(targetFromConfig("invalid"), undefined)
  assert.deepEqual(targetFromConfig("openai/team/model"), { providerID: "openai", modelID: "team/model" })
  assert.equal(targetFromConfig("/model"), undefined)
  assert.equal(targetFromConfig("openai/"), undefined)
})
