import type { SailExtensionContext } from "@finos/sail-extension"
import {
  SAIL_FDC3_APP_CONTRIBUTION,
  type SailFdc3AppContribution,
} from "@finos/sail-extension-fdc3/api"
import type { DirectoryApp } from "@finos/sail-headless-agent"
import { resolveBootFdc3DirectoryUrl } from "@finos/sail-env"
import {
  DIRECTORIES_DEFAULT_SETTINGS,
  DIRECTORIES_SETTINGS_KEY,
  seedSoleFdc3Directory,
  type DirectoriesSettings,
} from "./settings"

const SOURCE_ID = "sail.fdc3.directories"

async function fetchApps(url: string): Promise<DirectoryApp[]> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch AppD ${url}: ${res.status}`)
  }
  const json = (await res.json()) as { applications?: DirectoryApp[] } | DirectoryApp[]
  if (Array.isArray(json)) {
    return json
  }
  return json.applications ?? []
}

export async function activate(ctx: SailExtensionContext) {
  const registry = ctx.getExport<SailFdc3AppContribution>(SAIL_FDC3_APP_CONTRIBUTION)
  if (!registry) {
    throw new Error(`sail.fdc3.directories requires ${SAIL_FDC3_APP_CONTRIBUTION}`)
  }

  // Hosts must not resolve `?fdc3Directory=` / VITE — this extension owns that.
  await seedSoleFdc3Directory(ctx.storage, resolveBootFdc3DirectoryUrl())

  registry.registerSource(SOURCE_ID, {
    async returnApps() {
      const settings =
        (await ctx.storage.get<DirectoriesSettings>(DIRECTORIES_SETTINGS_KEY)) ??
        DIRECTORIES_DEFAULT_SETTINGS
      const apps: DirectoryApp[] = []
      for (const source of settings.sources) {
        if (!source.active) {
          continue
        }
        try {
          apps.push(...(await fetchApps(source.url)))
        } catch (err) {
          console.warn(`[sail.fdc3.directories] ${source.url}`, err)
        }
      }
      return apps
    },
  })

  ctx.subscriptions.push({
    dispose: () => registry.unregisterSource(SOURCE_ID),
  })

  return {}
}
