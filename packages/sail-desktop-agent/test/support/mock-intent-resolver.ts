/**
 * Mock Intent Resolver for Cucumber Tests
 *
 * Simulates user interaction with intent resolver UI.
 * Tests can program specific choices or use auto-resolution logic.
 */

import type {
  IntentResolutionCallback,
  IntentResolutionRequest,
  IntentResolutionResponse,
} from "../../src/handlers/intent-resolution-callback"

/**
 * Mock implementation of intent resolver for testing.
 *
 * Provides three resolution modes:
 * 1. Auto-resolve: Returns first handler if only one option
 * 2. Programmed: Returns pre-configured choice set by test
 * 3. Default: Returns first handler in list
 */
export class MockIntentResolver {
  private nextChoice: { instanceId?: string; appId: string } | null = null
  private resolutionHistory: IntentResolutionRequest[] = []
  private shouldCancelNext: boolean = false

  /**
   * Program the next resolution choice.
   * The resolver will return this handler on next call.
   */
  setNextChoice(handler: { instanceId?: string; appId: string }): void {
    this.nextChoice = handler
  }

  /**
   * Clear programmed choice
   */
  clearChoice(): void {
    this.nextChoice = null
  }

  /**
   * Configure the resolver to simulate user cancellation on the next call.
   * The callback will return selectedHandler: null, which the DA should
   * translate to ResolveError.UserCancelledResolution.
   */
  cancelNextResolution(): void {
    this.shouldCancelNext = true
  }

  /**
   * Get resolution history for verification
   */
  getResolutionHistory(): IntentResolutionRequest[] {
    return [...this.resolutionHistory]
  }

  /**
   * Clear resolution history
   */
  clearHistory(): void {
    this.resolutionHistory = []
  }

  /**
   * Create the callback function that matches IntentResolutionCallback interface.
   * This is what gets passed to DesktopAgent config.
   */
  createCallback(): IntentResolutionCallback {
    // Return a function matching the IntentResolutionCallback signature
    return (request: IntentResolutionRequest): Promise<IntentResolutionResponse> => {
      // Track the request for test verification
      this.resolutionHistory.push(request)

      // Simulate user cancellation if configured
      if (this.shouldCancelNext) {
        this.shouldCancelNext = false
        return Promise.resolve({
          requestId: request.requestId,
          selectedHandler: null,
        })
      }

      // Auto-resolve if only one handler available
      if (request.handlers.length === 1) {
        return Promise.resolve({
          requestId: request.requestId,
          selectedHandler: {
            instanceId: request.handlers[0]!.instanceId,
            appId: request.handlers[0]!.appId,
          },
        })
      }

      // Use programmed choice if available
      if (this.nextChoice) {
        const selected = this.nextChoice
        this.nextChoice = null // Consume the choice
        return Promise.resolve({
          requestId: request.requestId,
          selectedHandler: selected,
        })
      }

      // Default: return first handler
      return Promise.resolve({
        requestId: request.requestId,
        selectedHandler: {
          instanceId: request.handlers[0]!.instanceId,
          appId: request.handlers[0]!.appId,
        },
      })
    }
  }
}
