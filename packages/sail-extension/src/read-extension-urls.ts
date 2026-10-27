/** Extension URLs from a comma-separated env value, or the defaults when it has no entries. */
export function readExtensionUrls(raw: string | undefined, defaults: string[]): string[] {
  const entries = (raw ?? "")
    .split(",")
    .map(url => url.trim())
    .filter(Boolean)
  if (entries.length === 0) {
    return defaults
  }
  // Something was set: if every entry is invalid, load nothing rather than the localhost demo defaults.
  return entries.filter(url => {
    // Skip a bad entry the same way a failed import() is skipped, so one typo can't stop Sail starting.
    if (isHttpUrl(url)) {
      return true
    }
    console.warn(`[Sail] Ignoring extension URL that is not a valid http(s) URL: ${url}`)
    return false
  })
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}
