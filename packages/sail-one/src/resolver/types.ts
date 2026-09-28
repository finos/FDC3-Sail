import type { AppMetadata, Context, IntentMetadata } from "@finos/fdc3"
import type { TabDetail } from "../state/client-state"

export type AugmentedAppMetadata = AppMetadata & {
  channelData: TabDetail | null
  instanceTitle?: string
}

export type AugmentedAppIntent = {
  intent: IntentMetadata
  apps: AugmentedAppMetadata[]
}

export interface IntentResolution {
  appIntents: AugmentedAppIntent[]
  requestId: string
  context: Context
}
