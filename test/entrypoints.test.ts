import assert from "node:assert/strict"
import test from "node:test"

import type { TuiPluginApi } from "@opencode-ai/plugin/tui"

import serverModule from "../src/server.js"
import { currentTarget, registerUsageCommand } from "../src/tui.js"

test("server entrypoint registers the usage tool", async () => {
  const hooks = await serverModule.server({ client: {} } as never)
  assert.ok(hooks.tool?.usage)
  assert.match(hooks.tool.usage.description, /usage limits/i)
})

test("TUI entrypoint registers a real /usage command", () => {
  let layer: { commands?: Array<Record<string, unknown>> } | undefined
  const api = {
    keymap: {
      registerLayer(value: typeof layer) {
        layer = value
        return () => undefined
      },
    },
    route: { current: { name: "home" } },
    state: { config: { model: "openai/gpt-5" } },
  } as unknown as TuiPluginApi

  registerUsageCommand(api)
  assert.equal(layer?.commands?.[0]?.slashName, "usage")
  assert.equal(layer?.commands?.[0]?.namespace, "palette")
  assert.deepEqual(currentTarget(api), { providerID: "openai", modelID: "gpt-5" })
})
