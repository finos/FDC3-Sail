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
  type DirectorySource,
} from "./settings"

const SOURCE_ID = "sail.fdc3.directories"

async function fetchApps(url: string): Promise<DirectoryApp[]> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch AppD ${url}: ${res.status}`)
  }
  const json = (await res.json()) as
    | { applications?: DirectoryApp[]; appId?: string }
    | DirectoryApp[]
  if (Array.isArray(json)) {
    return json
  }
  if (Array.isArray(json.applications)) {
    return json.applications
  }
  // Single AppD record (e.g. fdc3-workbench.json on fdc3.finos.org).
  if (typeof json.appId === "string") {
    return [json as DirectoryApp]
  }
  return []
}

/** Active AppD sources to query, ordered for stable comparison. */
function activeAppDRecords(sources: DirectorySource[]): DirectorySource[] {
  return sources
    .filter(s => s.active)
    .map(s => ({ id: s.id, label: s.label, url: s.url, active: true }))
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
}

function sameAppDRecords(a: DirectorySource[], b: DirectorySource[]): boolean {
  if (a.length !== b.length) {
    return false
  }
  return a.every(
    (record, i) =>
      record.id === b[i]!.id &&
      record.url === b[i]!.url &&
      record.label === b[i]!.label &&
      record.active === b[i]!.active,
  )
}

export async function activate(ctx: SailExtensionContext) {
  const registry = ctx.getExport<SailFdc3AppContribution>(SAIL_FDC3_APP_CONTRIBUTION)
  if (!registry) {
    throw new Error(`sail.fdc3.directories requires ${SAIL_FDC3_APP_CONTRIBUTION}`)
  }

  // Hosts must not resolve `?fdc3Directory=` / VITE — this extension owns that.
  await seedSoleFdc3Directory(ctx.storage, resolveBootFdc3DirectoryUrl())

  /** Last AppD source records queried, plus the apps they produced. */
  let lastQueried: { records: DirectorySource[]; apps: DirectoryApp[] } | null = null

  registry.registerSource(SOURCE_ID, {
    async returnApps() {
      const settings =
        (await ctx.storage.get<DirectoriesSettings>(DIRECTORIES_SETTINGS_KEY)) ??
        DIRECTORIES_DEFAULT_SETTINGS
      const records = activeAppDRecords(settings.sources)

      if (lastQueried && sameAppDRecords(lastQueried.records, records)) {
        return lastQueried.apps
      }

      const apps: DirectoryApp[] = []
      for (const source of records) {
        try {
          apps.push(...(await fetchApps(source.url)))
        } catch (err) {
          console.warn(`[sail.fdc3.directories] ${source.url}`, err)
        }
      }
      lastQueried = { records, apps }
      return apps
    },
  })

  ctx.subscriptions.push({
    dispose: () => {
      registry.unregisterSource(SOURCE_ID)
      lastQueried = null
    },
  })

  return {}
}
