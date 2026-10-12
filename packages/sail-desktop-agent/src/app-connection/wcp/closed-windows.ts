import type { AppConnectionMetadata } from "./wcp-types"

/**
 * Browser-Resident DA spec, "Disconnects": an app whose WCP1 source `WindowProxy` reports
 * `closed` has closed (or navigated cross-origin). Returns those instance ids.
 */
export function findClosedWindowInstanceIds(connections: AppConnectionMetadata[]): string[] {
  return connections
    .filter(connection => (connection.source as { closed?: unknown } | undefined)?.closed === true)
    .map(connection => connection.instanceId)
}
