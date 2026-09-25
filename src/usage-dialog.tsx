/** @jsxImportSource @opentui/solid */
import type { RGBA } from "@opentui/core"
import type { TuiPluginApi } from "@opencode-ai/plugin/tui"
import { For, Show, createSignal, onCleanup, onMount } from "solid-js"

import { publicErrorMessage, type UsageSnapshot, type UsageTarget, type UsageWindow } from "./domain.js"
import { clampPercent, formatAbsoluteReset, formatPercent, formatRelativeReset } from "./format/text.js"
import type { UsageService } from "./service.js"

export const DISPLAY_CACHE_MAX_AGE_MS = 10 * 60_000
export const BACKGROUND_REFRESH_INTERVAL_MS = 30_000
const CACHE_REVALIDATE_AFTER_MS = 2_000

type Color = RGBA | string

type Skin = {
  accent: Color
  border: Color
  error: Color
  muted: Color
  panel: Color
  success: Color
  text: Color
  warning: Color
}

function skin(api: TuiPluginApi): Skin {
  const theme = api.theme.current
  return {
    accent: theme.primary,
    border: theme.border,
    error: theme.error,
    muted: theme.textMuted,
    panel: theme.backgroundPanel,
    success: theme.success,
    text: theme.text,
    warning: theme.warning,
  }
}

function titleCase(value: string): string {
  return value.replace(/(^|[_-])([a-z])/g, (_match, prefix: string, letter: string) => `${prefix ? " " : ""}${letter.toUpperCase()}`)
}

function barColor(window: UsageWindow, colors: Skin): Color {
  if (window.usedPercent >= 90) return colors.error
  if (window.usedPercent >= 70) return colors.warning
  return colors.accent
}

function ProgressBar(props: { window: UsageWindow; colors: Skin }) {
  const width = 32
  const filled = () => Math.round((clampPercent(props.window.usedPercent) / 100) * width)
  return (
    <text>
      <span style={{ fg: barColor(props.window, props.colors) }}>{"█".repeat(filled())}</span>
      <span style={{ fg: props.colors.border }}>{"░".repeat(width - filled())}</span>
    </text>
  )
}

function LimitRow(props: { window: UsageWindow; colors: Skin }) {
  const absolute = () => formatAbsoluteReset(props.window.resetAt)
  return (
    <box flexDirection="column" gap={1}>
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.colors.text}>
          <b>{props.window.label}</b>
        </text>
        <text fg={barColor(props.window, props.colors)}>
          <b>{formatPercent(props.window.usedPercent)}% used</b>
        </text>
      </box>
      <ProgressBar window={props.window} colors={props.colors} />
      <box flexDirection="row" justifyContent="space-between">
        <text fg={props.colors.muted}>{formatPercent(100 - clampPercent(props.window.usedPercent))}% remaining</text>
        <text fg={props.colors.muted}>
          {formatRelativeReset(props.window.resetAt)}
          {absolute() ? ` · ${absolute()}` : ""}
        </text>
      </box>
    </box>
  )
}

function UsageContent(props: { snapshot: UsageSnapshot; colors: Skin }) {
  const provider = () => (props.snapshot.providerID === "openai" ? "OpenAI" : titleCase(props.snapshot.providerID))
  return (
    <>
      <box flexDirection="row" gap={1}>
        <box backgroundColor={props.colors.accent} paddingLeft={1} paddingRight={1}>
          <text fg={props.colors.panel}>
            <b>{provider()}</b>
          </text>
        </box>
        <Show when={props.snapshot.plan}>
          {(plan) => <text fg={props.colors.muted}>{titleCase(plan())} plan</text>}
        </Show>
      </box>

      <box flexDirection="column" gap={2} paddingTop={1}>
        <For each={props.snapshot.windows}>{(window) => <LimitRow window={window} colors={props.colors} />}</For>
      </box>

      <box border={["top"]} borderColor={props.colors.border} paddingTop={1} marginTop={1} flexDirection="column">
        <text fg={props.colors.muted}>
          Model <span style={{ fg: props.colors.text }}>{props.snapshot.modelID || "OpenAI account"}</span>
        </text>
        <text fg={props.colors.muted}>Limits are reported by the provider and may be shared across models.</text>
      </box>
    </>
  )
}

export function UsageDialog(props: { api: TuiPluginApi; service: UsageService; target: UsageTarget }) {
  const colors = skin(props.api)
  const controller = new AbortController()
  const cached = props.service.peek(props.target, DISPLAY_CACHE_MAX_AGE_MS)
  const [snapshot, setSnapshot] = createSignal<UsageSnapshot | undefined>(cached)
  const [error, setError] = createSignal<unknown>()
  const [refreshError, setRefreshError] = createSignal<unknown>()
  const [refreshing, setRefreshing] = createSignal(false)

  const refresh = async (force: boolean) => {
    if (refreshing()) return
    setRefreshing(true)
    try {
      const value = await props.service.get({ ...props.target, signal: controller.signal }, { force })
      if (!controller.signal.aborted) {
        setSnapshot(value)
        setError(undefined)
        setRefreshError(undefined)
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        if (snapshot()) setRefreshError(cause)
        else setError(cause)
      }
    } finally {
      if (!controller.signal.aborted) setRefreshing(false)
    }
  }

  onMount(() => {
    const value = snapshot()
    const force = Boolean(value && Date.now() - value.fetchedAt >= CACHE_REVALIDATE_AFTER_MS)
    void refresh(force)
    const interval = setInterval(() => void refresh(true), BACKGROUND_REFRESH_INTERVAL_MS)
    onCleanup(() => clearInterval(interval))
  })
  onCleanup(() => controller.abort())

  return (
    <box flexDirection="column" gap={1} paddingBottom={1} paddingLeft={2} paddingRight={2}>
      <box flexDirection="row" justifyContent="space-between" paddingBottom={1}>
        <text fg={colors.text}>
          <b>Usage limits</b>
        </text>
        <text fg={colors.muted}>esc to close</text>
      </box>

      <Show when={snapshot()} fallback={
        <Show
          when={!error()}
          fallback={
            <box
              border
              borderColor={colors.error}
              paddingTop={1}
              paddingBottom={1}
              paddingLeft={2}
              paddingRight={2}
              flexDirection="column"
              gap={1}
            >
              <text fg={colors.error}>
                <b>Usage unavailable</b>
              </text>
              <text fg={colors.text}>{publicErrorMessage(error())}</text>
            </box>
          }
        >
          <box border borderColor={colors.border} paddingTop={1} paddingBottom={1} paddingLeft={2} paddingRight={2}>
            <text fg={colors.muted}>Loading provider limits...</text>
          </box>
        </Show>
      }>
        {(value) => (
          <>
            <UsageContent snapshot={value()} colors={colors} />
            <Show when={refreshing()}>
              <text fg={colors.muted}>Refreshing in the background...</text>
            </Show>
            <Show when={!refreshing() && refreshError()}>
              <text fg={colors.warning}>Showing cached limits · background refresh unavailable</text>
            </Show>
          </>
        )}
      </Show>
    </box>
  )
}
