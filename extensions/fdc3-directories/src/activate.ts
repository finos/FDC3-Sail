import type { SailExtensionContext } from "@finos/sail-extension"
import {
  SAIL_FDC3_APP_DIRECTORY,
  type SailFdc3AppDirectory,
} from "@finos/sail-extension-fdc3/api"
import type { DirectoryApp } from "@finos/sail-headless-agent"
import { resolveBootFdc3DirectoryUrl } from "@finos/sail-env"
import {
  DIRECTORIES_DEFAULT_SETTINGS,
  DIRECTORIES_SETTINGS_KEY,
  seedSoleFdc3Directory,
  type DirectoriesSettings,
  type DirectorySource,
} from "./settings"

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

async function sync(ctx: SailExtensionContext, appDirectory: SailFdc3AppDirectory) {
  const settings =
    (await ctx.storage.get<DirectoriesSettings>(DIRECTORIES_SETTINGS_KEY)) ??
    DIRECTORIES_DEFAULT_SETTINGS

  for (const source of settings.sources) {
    if (!source.active) {
      appDirectory.removeSource(sourceKey(source))
      continue
    }
    try {
      const apps = await fetchApps(source.url)
      appDirectory.replaceSource(sourceKey(source), apps)
    } catch (err) {
      console.warn(`[sail.fdc3.directories] ${source.url}`, err)
      appDirectory.removeSource(sourceKey(source))
    }
  }
}

function sourceKey(source: DirectorySource): string {
  return `directories:${source.id}`
}

export async function activate(ctx: SailExtensionContext) {
  const appDirectory = ctx.getExport<SailFdc3AppDirectory>(SAIL_FDC3_APP_DIRECTORY)
  if (!appDirectory) {
    throw new Error(`sail.fdc3.directories requires ${SAIL_FDC3_APP_DIRECTORY}`)
  }

  // Hosts must not resolve `?fdc3Directory=` / VITE — this extension owns that.
  await seedSoleFdc3Directory(ctx.storage, resolveBootFdc3DirectoryUrl())
  await sync(ctx, appDirectory)

  ctx.subscriptions.push({
    dispose: ctx.storage.onChange(change => {
      if (change.key === DIRECTORIES_SETTINGS_KEY) {
        void sync(ctx, appDirectory)
      }
    }),
  })

  return {}
}
