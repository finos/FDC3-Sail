import type {
  ChannelState,
  DirectoryApp,
  FDC3ServerInstance,
} from "@finos/sail-headless-agent"

export {
  SAIL_FDC3_APP_CONTRIBUTION,
  SAIL_FDC3_CHANNELS,
  SAIL_FDC3_INSTANCE,
  SAIL_FDC3_INTENT_RESOLVER,
  SAIL_FDC3_REGISTER_MIDDLEWARE,
} from "./ids.js"

export type SailMiddleware = Partial<{
  receive: FDC3ServerInstance["receive"]
  post: FDC3ServerInstance["post"]
}>

export type RegisterMiddleware = (
  mw: SailMiddleware & { priority?: number },
) => { dispose(): void }

/**
 * Dynamic app source. Called whenever the directory/catalog is queried.
 */
export interface SailFdc3AppContributor {
  returnApps(): Promise<DirectoryApp[]>
}

/**
 * Registry of app contributors.
 * directories / customApps {@link registerSource}; they do not talk to catalog.
 */
export interface SailFdc3AppContribution {
  registerSource(sourceId: string, contributor: SailFdc3AppContributor): void
  unregisterSource(sourceId: string): void
  retrieveAllApps(): Promise<DirectoryApp[]>
}

export type SailFdc3AppChannelChangeEvent = {
  instanceId: string
  channelId: string | null
}

/**
 * User-channel catalog (persisted by sail.fdc3) + per-app membership on the active session.
 */
export interface SailFdc3Channels {
  getUserChannels(): ChannelState[]
  setUserChannels(channels: ChannelState[]): Promise<void>
  onCatalogChange(listener: () => void): () => void

  getAppChannelId(instanceId: string): string | null
  getAppChannel(instanceId: string): ChannelState | null
  changeAppChannel(instanceId: string, channelId: string | null): Promise<void>
  onAppChannelChange(listener: (event: SailFdc3AppChannelChangeEvent) => void): () => void
}
