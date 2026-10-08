import assert from "node:assert/strict"
import test from "node:test"

import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import type { PluginContext } from "@opencode-ai/plugin/v2/promise"

import plugin from "opencode-slash-usage"
import serverModule from "opencode-slash-usage/server"
import tuiModule, { currentTarget } from "opencode-slash-usage/tui"

test("package root exposes a no-op v2 Promise plugin", async () => {
  const context = new Proxy({} as PluginContext, {
    get() {
      throw new Error("The TUI-only root must not access server APIs")
    },
  })
  assert.equal(plugin.id, "opencode-usage")
  assert.deepEqual(Object.keys(plugin).sort(), ["id", "setup"])
  assert.equal(await plugin.setup(context), undefined)
})

test("legacy server entrypoint stays loadable without a model-callable tool", async () => {
  const hooks = await serverModule.server({ client: {} } as never)
  assert.equal(serverModule.id, plugin.id)
  assert.equal(hooks.tool, undefined)
  assert.deepEqual(hooks, {})
})

test("TUI package entrypoint registers /usage and opens its dialog", async () => {
  let layer: { commands?: Array<Record<string, unknown>> } | undefined
  let dialogSize: string | undefined
  let dialogFactory: unknown
  const api = {
    keymap: {
      registerLayer(value: typeof layer) {
        layer = value
        return () => undefined
      },
    },
    route: { current: { name: "home" } },
    state: { config: { model: "openai/gpt-5" } },
    ui: {
      dialog: {
        setSize(size: string) {
          dialogSize = size
        },
        replace(factory: unknown) {
          dialogFactory = factory
        },
      },
    },
  } as unknown as TuiPluginApi

  await tuiModule.tui(api, {}, {} as never)
  assert.equal(tuiModule.id, plugin.id)
  assert.equal(layer?.commands?.length, 1)
  assert.equal(layer?.commands?.[0]?.slashName, "usage")
  assert.equal(layer?.commands?.[0]?.namespace, "palette")
  assert.deepEqual(currentTarget(api), { providerID: "openai", modelID: "gpt-5" })
  const run = layer?.commands?.[0]?.run as () => void
  run()
  assert.equal(dialogSize, "medium")
  assert.equal(typeof dialogFactory, "function")
})

test("TUI target prefers the active session model and falls back to config or OpenAI", () => {
  const api = (model?: { providerID: string; id: string }, configModel?: string) => ({
    route: { current: { name: "session", params: { sessionID: "session-1" } } },
    state: {
      config: { model: configModel },
      session: {
        get(sessionID: string) {
          assert.equal(sessionID, "session-1")
          return model ? { model } : undefined
        },
      },
    },
  }) as unknown as TuiPluginApi

  assert.deepEqual(currentTarget(api({ providerID: "anthropic", id: "claude" }, "openai/gpt-5")), {
    providerID: "anthropic", modelID: "claude",
  })
  assert.deepEqual(currentTarget(api(undefined, "openai/gpt-5")), { providerID: "openai", modelID: "gpt-5" })
  assert.deepEqual(currentTarget(api(undefined, "invalid")), { providerID: "openai" })
})
