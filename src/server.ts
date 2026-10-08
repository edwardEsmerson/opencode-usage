import type { Plugin, PluginModule } from "@opencode-ai/plugin"

// Keep existing singular `plugin` configuration entries loadable.
const server: Plugin = async () => ({})

export default {
  id: "opencode-usage",
  server,
} satisfies PluginModule
