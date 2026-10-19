import type { HostIntentResolverPayload, HostIntentResolverResponse } from "../../host-contracts"
import { consoleLogger } from "../../logging/logger"

export interface PendingIntentResolution {
  resolve: (response: HostIntentResolverResponse) => void
  reject: (error: Error) => void
  timeoutId: ReturnType<typeof setTimeout>
}

export function requestIntentResolution(
  pendingIntentResolutions: Map<string, PendingIntentResolution>,
  emitIntentResolverNeeded: (payload: HostIntentResolverPayload) => void,
  payload: HostIntentResolverPayload,
  timeoutMs: number,
): Promise<HostIntentResolverResponse> {
  return new Promise((resolve, reject) => {
    // Set up timeout to reject if UI doesn't respond
    const timeoutId = setTimeout(() => {
      pendingIntentResolutions.delete(payload.requestId)
      reject(new Error(`Intent resolution timed out after ${timeoutMs}ms`))
    }, timeoutMs)

    // Store pending resolution
    pendingIntentResolutions.set(payload.requestId, {
      resolve,
      reject,
      timeoutId,
    })

    // Emit event to UI
    emitIntentResolverNeeded(payload)
  })
}

export function resolveIntentSelection(
  pendingIntentResolutions: Map<string, PendingIntentResolution>,
  response: HostIntentResolverResponse,
): void {
  const pending = pendingIntentResolutions.get(response.requestId)
  if (!pending) {
    consoleLogger.warn(`No pending intent resolution found for requestId: ${response.requestId}`)
    return
  }

  // Clear timeout and remove from pending
  clearTimeout(pending.timeoutId)
  pendingIntentResolutions.delete(response.requestId)

  // Resolve the promise with the user's selection
  pending.resolve(response)
}
