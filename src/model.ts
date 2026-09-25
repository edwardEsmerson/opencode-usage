import type { UsageTarget } from "./domain.js"

type MessageLike = {
  role?: string
  model?: {
    providerID?: string
    modelID?: string
  }
}

export function targetFromMessages(messages: readonly MessageLike[]): UsageTarget | undefined {
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index]
    if (message?.role !== "user" || !message.model?.providerID) continue
    return { providerID: message.model.providerID, modelID: message.model.modelID }
  }
  return undefined
}

export function targetFromConfig(model: string | undefined): UsageTarget | undefined {
  if (!model) return undefined
  const separator = model.indexOf("/")
  if (separator <= 0 || separator === model.length - 1) return undefined
  return { providerID: model.slice(0, separator), modelID: model.slice(separator + 1) }
}
