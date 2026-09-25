import { tool, type Plugin, type PluginModule } from "@opencode-ai/plugin"

import { publicErrorMessage } from "./domain.js"
import { formatUsageText } from "./format/text.js"
import { targetFromMessages } from "./model.js"
import { createUsageService } from "./service.js"

const server: Plugin = async ({ client }) => {
  const usage = createUsageService()

  return {
    tool: {
      usage: tool({
        description:
          "Show the current model provider's account usage limits, including session and weekly percentages and reset times.",
        args: {},
        async execute(_args, context) {
          try {
            const result = await client.session.messages({
              path: { id: context.sessionID },
              query: { directory: context.directory, limit: 100 },
            })
            const messages = (result.data || []).map((message) => message.info)
            const target = targetFromMessages(messages) || { providerID: "openai" }
            const snapshot = await usage.get({ ...target, signal: context.abort })
            const provider = snapshot.providerID === "openai" ? "OpenAI" : snapshot.providerID
            context.metadata({ title: `${provider} usage` })
            return {
              title: `${provider} usage`,
              output: formatUsageText(snapshot),
              metadata: {
                providerID: snapshot.providerID,
                modelID: snapshot.modelID,
                fetchedAt: snapshot.fetchedAt,
              },
            }
          } catch (error) {
            return {
              title: "Usage unavailable",
              output: publicErrorMessage(error),
              metadata: { error: true },
            }
          }
        },
      }),
    },
  }
}

export default {
  id: "opencode-usage",
  server,
} satisfies PluginModule
