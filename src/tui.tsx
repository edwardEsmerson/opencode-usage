/** @jsxImportSource @opentui/solid */
import type { TuiPlugin, TuiPluginApi, TuiPluginModule } from "@opencode-ai/plugin/tui"

import type { UsageTarget } from "./domain.js"
import { targetFromConfig } from "./model.js"
import { createUsageService } from "./service.js"
import { UsageDialog } from "./usage-dialog.js"

export function currentTarget(api: TuiPluginApi): UsageTarget {
  const route = api.route.current
  if (route.name === "session") {
    const sessionID = "params" in route && typeof route.params?.sessionID === "string" ? route.params.sessionID : undefined
    const model = sessionID ? api.state.session.get(sessionID)?.model : undefined
    if (model?.providerID) return { providerID: model.providerID, modelID: model.id }
  }

  return targetFromConfig(api.state.config.model) || { providerID: "openai" }
}

export function registerUsageCommand(api: TuiPluginApi): void {
  const service = createUsageService()
  api.keymap.registerLayer({
    commands: [
      {
        name: "usage.open",
        title: "Usage limits",
        category: "Plugin",
        namespace: "palette",
        slashName: "usage",
        run() {
          const target = currentTarget(api)
          api.ui.dialog.setSize("medium")
          api.ui.dialog.replace(() => <UsageDialog api={api} service={service} target={target} />)
        },
      },
    ],
    bindings: [],
  })
}

const tui: TuiPlugin = async (api) => {
  registerUsageCommand(api)
}

export default {
  id: "opencode-usage",
  tui,
} satisfies TuiPluginModule
