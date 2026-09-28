/**
 * Context validation for FDC3 Context arguments.
 * Used to return MalformedContext when context is provided but invalid (e.g. missing type).
 */

import type { Context } from "@finos/fdc3"

/**
 * Returns true if the value is a valid FDC3 Context (object with string `type`).
 * Used by handlers to return ResolveError/OpenError/ChannelError.MalformedContext
 * when the client sends an invalid context (e.g. object without `type` field).
 */
export function isValidContext(value: unknown): value is Context {
  return value !== null && typeof value === "object" && typeof (value as Context).type === "string"
}
