/**
 * Normalizes an app identity URL for comparison (trailing slashes removed).
 */
export function normalizeIdentityUrl(identityUrl: string): string {
  return identityUrl.replace(/\/+$/, "")
}

/**
 * Path equivalence for AppD vs WCP identityUrl (e.g. `/app` vs `/app/index.html`).
 */
export function normalizeUrlPathname(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, "") || "/"
  return trimmed.replace(/\/index\.html$/i, "") || "/"
}

/**
 * True when two absolute or site-relative URLs refer to the same app document.
 */
export function urlsReferToSameApp(
  a: string,
  b: string,
  baseOrigin = "http://localhost",
): boolean {
  const na = normalizeIdentityUrl(a)
  const nb = normalizeIdentityUrl(b)
  if (na === nb || a === b) {
    return true
  }
  try {
    const ua = new URL(a, baseOrigin)
    const ub = new URL(b, baseOrigin)
    return (
      ua.origin === ub.origin &&
      normalizeUrlPathname(ua.pathname) === normalizeUrlPathname(ub.pathname)
    )
  } catch {
    return false
  }
}
