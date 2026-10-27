/** Extension URLs from a comma-separated env value, or the defaults when unset, empty or all invalid. */
export function readExtensionUrls(raw: string | undefined, defaults: string[]): string[] {
  const urls = (raw ?? "")
    .split(",")
    .map(url => url.trim())
    .filter(Boolean)
    .filter(url => {
      // Skip a bad entry the same way a failed import() is skipped, so one typo can't stop Sail starting.
      if (isHttpUrl(url)) {
        return true
      }
      console.warn(`[Sail] Ignoring extension URL that is not a valid http(s) URL: ${url}`)
      return false
    })
  return urls.length > 0 ? urls : defaults
}

function isHttpUrl(value: string): boolean {
  try {
    const { protocol } = new URL(value)
    return protocol === "http:" || protocol === "https:"
  } catch {
    return false
  }
}
