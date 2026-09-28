/**
 * DACP Error Classes
 *
 * Custom error classes for DACP protocol operations.
 * These extend Error to provide proper stack traces and error handling.
 *
 * DACP* classes are for internal use only; wire error codes come from @finos/fdc3.
 */

export class DACPTimeoutError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "DACPTimeoutError"
  }
}

/** Wraps an unrecognised failure from a handler. The original throw is on `cause`. */
export class DACPProcessingError extends Error {
  constructor(message: string, options?: ErrorOptions) {
    super(message, options)
    this.name = "DACPProcessingError"
  }
}
