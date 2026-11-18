import type {
  DirectoryApp,
  FDC3ServerInstance,
} from "@finos/sail-headless-agent"

export {
  SAIL_FDC3_APP_DIRECTORY,
  SAIL_FDC3_REGISTER_MIDDLEWARE,
  SAIL_FDC3_SERVER_FACTORY,
} from "./ids.js"

export type SailMiddleware = Partial<{
  receive: FDC3ServerInstance["receive"]
  post: FDC3ServerInstance["post"]
}>

export type RegisterMiddleware = (
  mw: SailMiddleware & { priority?: number },
) => { dispose(): void }

/**
 * Source-scoped App Directory contributions.
 * directories / customApps call replaceSource / removeSource; they do not talk to catalog.
 * Obtained per session from SailFDC3ServerFactory.createInstance.
 */
export interface SailFdc3AppDirectory {
  replaceSource(sourceId: string, apps: DirectoryApp[]): void
  removeSource(sourceId: string): void
  retrieveAllApps(): DirectoryApp[]
}
