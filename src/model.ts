import type { UsageTarget } from "./domain.js"

export function targetFromConfig(model: string | undefined): UsageTarget | undefined {
  if (!model) return undefined
  const separator = model.indexOf("/")
  if (separator <= 0 || separator === model.length - 1) return undefined
  return { providerID: model.slice(0, separator), modelID: model.slice(separator + 1) }
}
