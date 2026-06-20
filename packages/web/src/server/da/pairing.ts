import crypto from "node:crypto"

/**
 * Default installation key for Sail PoC pairing secret derivation.
 * Override via SAIL_INSTALLATION_KEY environment variable in production.
 */
const DEFAULT_INSTALLATION_KEY = "sail-dev-installation-key"

function getInstallationKey(): string {
  return process.env.SAIL_INSTALLATION_KEY ?? DEFAULT_INSTALLATION_KEY
}

/**
 * Derives a stable per-user, per-app pairing secret.
 * Normative algorithm: HMAC-SHA256(installationKey, sessionId + ":" + appId)
 */
export function deriveSharedSecret(sessionId: string, appId: string): string {
  return crypto
    .createHmac("sha256", getInstallationKey())
    .update(`${sessionId}:${appId}`)
    .digest("hex")
    .substring(0, 32)
}

/**
 * Validates a shared secret against the expected pairing for sessionId + appId.
 */
export function validateSharedSecret(
  sessionId: string,
  appId: string,
  sharedSecret: string,
): boolean {
  const expected = deriveSharedSecret(sessionId, appId)
  if (sharedSecret.length !== expected.length) {
    return false
  }
  return crypto.timingSafeEqual(
    Buffer.from(sharedSecret),
    Buffer.from(expected),
  )
}
