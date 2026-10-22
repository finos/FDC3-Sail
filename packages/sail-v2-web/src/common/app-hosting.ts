export enum AppHosting {
  Frame,
  Tab,
  Remote,
}

export type {
  SailHostManifest,
  ResolvedSailHostManifest,
} from "@finos/sail-headless-agent"

export {
  SAIL_HOST_MANIFEST_DEFAULTS,
  parseSailHostManifest,
  sailHostManifestFromApp,
} from "@finos/sail-headless-agent"
