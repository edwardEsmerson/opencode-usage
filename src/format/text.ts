import type { UsageSnapshot, UsageWindow } from "../domain.js"

export function clampPercent(value: number): number {
  return Math.max(0, Math.min(100, value))
}

export function formatPercent(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function formatRelativeReset(resetAt: number | undefined, now = Date.now()): string {
  if (resetAt === undefined) return "Reset time unavailable"
  const remaining = Math.max(0, resetAt - now)
  const totalMinutes = Math.ceil(remaining / 60_000)
  if (totalMinutes <= 1) return "Resets in less than a minute"
  const days = Math.floor(totalMinutes / (24 * 60))
  const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
  const minutes = totalMinutes % 60
  const parts: string[] = []
  if (days) parts.push(`${days}d`)
  if (hours) parts.push(`${hours}h`)
  if (!days && minutes) parts.push(`${minutes}m`)
  return `Resets in ${parts.join(" ")}`
}

export function formatAbsoluteReset(resetAt: number | undefined): string | undefined {
  if (resetAt === undefined) return undefined
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  }).format(resetAt)
}

export function textProgressBar(value: number, width = 24): string {
  const filled = Math.round((clampPercent(value) / 100) * width)
  return `[${"#".repeat(filled)}${"-".repeat(width - filled)}]`
}

export function formatWindowLine(window: UsageWindow, now = Date.now()): string {
  const used = formatPercent(window.usedPercent)
  const remaining = formatPercent(100 - clampPercent(window.usedPercent))
  return [
    `${window.label}: ${used}% used (${remaining}% left)`,
    `${textProgressBar(window.usedPercent)} ${formatRelativeReset(window.resetAt, now)}`,
  ].join("\n")
}

export function formatUsageText(snapshot: UsageSnapshot, now = Date.now()): string {
  const provider = snapshot.providerID === "openai" ? "OpenAI" : snapshot.providerID
  const heading = [provider, snapshot.plan, snapshot.modelID].filter(Boolean).join(" | ")
  return [`Usage - ${heading}`, "", ...snapshot.windows.flatMap((window, index) => [formatWindowLine(window, now), ...(index < snapshot.windows.length - 1 ? [""] : [])])].join("\n")
}
