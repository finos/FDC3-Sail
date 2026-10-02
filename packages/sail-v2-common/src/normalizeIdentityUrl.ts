/**
 * Normalizes an app identity URL for comparison (trailing slashes removed).
 */
export function normalizeIdentityUrl(identityUrl: string): string {
  return identityUrl.replace(/\/+$/, "")
}
