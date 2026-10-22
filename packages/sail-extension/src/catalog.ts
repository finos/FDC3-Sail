export const SAIL_EXTENSIONS_ORIGIN = "http://localhost:9100"

export type SailExtensionCatalogEntry = {
  id: string
  title: string
  core: string
  file?: string
}

export async function fetchExtensionCatalog(
  origin: string = SAIL_EXTENSIONS_ORIGIN,
): Promise<SailExtensionCatalogEntry[]> {
  const response = await fetch(`${origin.replace(/\/$/, "")}/extensions.json`)
  if (!response.ok) {
    throw new Error(`GET ${origin}/extensions.json failed: ${response.status}`)
  }
  const body = (await response.json()) as { extensions?: SailExtensionCatalogEntry[] }
  return body.extensions ?? []
}

export async function loadExtensionCoreUrls(
  pinned: readonly string[],
  origin?: string,
): Promise<{ urls: string[]; catalog: SailExtensionCatalogEntry[] }> {
  let catalog: SailExtensionCatalogEntry[] = []
  try {
    catalog = await fetchExtensionCatalog(origin)
  } catch {
    catalog = []
  }
  return { urls: mergeExtensionCoreUrls(pinned, catalog), catalog }
}

export function mergeExtensionCoreUrls(
  pinned: readonly string[],
  catalog: readonly SailExtensionCatalogEntry[],
): string[] {
  const seen = new Set<string>()
  const urls: string[] = []
  for (const url of [...pinned, ...catalog.map(entry => entry.core)]) {
    if (seen.has(url)) {
      continue
    }
    seen.add(url)
    urls.push(url)
  }
  return urls
}
