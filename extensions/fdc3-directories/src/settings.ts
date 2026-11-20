import type { SailExtensionStorage } from "@finos/sail-extension"

export const FDC3_DIRECTORIES_EXTENSION_ID = "sail.fdc3.directories"

export const DIRECTORIES_SETTINGS_KEY = "directories"

export const SOLE_DIRECTORY_SOURCE_ID = "sole"

export type DirectorySource = {
  id: string
  label: string
  url: string
  active: boolean
}

export type DirectoriesSettings = {
  sources: DirectorySource[]
}

export const DIRECTORIES_DEFAULT_SETTINGS: DirectoriesSettings = {
  sources: [
    {
      id: "fdc3-workbench",
      label: "FDC3 Workbench",
      url: "https://fdc3.finos.org/toolbox/fdc3-workbench/fdc3-workbench.json",
      active: true,
    },
    {
      id: "fdc3-conformance",
      label: "FDC3 Conformance",
      url: "https://fdc3.finos.org/toolbox/fdc3-conformance/directories/website-conformance.json",
      active: true,
    },
  ],
}

/** Settings bag with exactly one active AppD (conformance / `?fdc3Directory=`). */
export function buildSoleDirectorySettings(url: string): DirectoriesSettings {
  return {
    sources: [
      {
        id: SOLE_DIRECTORY_SOURCE_ID,
        label: "App Directory",
        url,
        active: true,
      },
    ],
  }
}

/**
 * Persist a sole AppD URL into directories extension storage so `activate` can
 * register it with `sail.fdc3.appContribution`. Called from activate after
 * `@finos/sail-env`'s `resolveBootFdc3DirectoryUrl()`. No-op when `url` is absent.
 */
export async function seedSoleFdc3Directory(
  storage: SailExtensionStorage,
  url: string | undefined,
): Promise<DirectoriesSettings | undefined> {
  if (!url) {
    return undefined
  }
  const settings = buildSoleDirectorySettings(url)
  await storage.set(DIRECTORIES_SETTINGS_KEY, settings)
  return settings
}
