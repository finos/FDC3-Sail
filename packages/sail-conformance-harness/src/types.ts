import type { AppMetadata, Context } from "@finos/fdc3"

/** Handler option for programmatic intent resolution (matches desktop-agent shape). */
export type IntentHandlerOption = AppMetadata & {
  isRunning: boolean
}

/** Request payload for programmatic intent resolution. */
export type IntentResolutionRequest = {
  requestId: string
  intent: string
  context: Context
  handlers: IntentHandlerOption[]
}

/** How the harness mounts a launched conformance app. */
export type HarnessLaunchMode = "iframe" | "popup"

/** One mounted conformance app panel in the harness host. */
export type HarnessPanel = {
  instanceId: string
  appId: string
  url: string
  title?: string
  launchMode: HarnessLaunchMode
  /** Set when launch was triggered by `fdc3.open` with context (pending listener delivery). */
  openWithContext?: boolean
}

/** React host state for mounted app panels. */
export type HarnessState = {
  panels: HarnessPanel[]
}
