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
