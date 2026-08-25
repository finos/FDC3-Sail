import { ResolveError, OpenError, ChannelError } from "@finos/fdc3"

/**
 * FDC3 Error Classes
 *
 * Typed error classes for FDC3 operations that can be used in handlers.
 * These errors carry FDC3 error enum values that can be directly used in DACP responses.
 *
 * Note on DACP/FDC3 Error Mapping:
 * - Most FDC3 error enum values match DACP error strings (e.g., "AppNotFound", "NoChannelFound")
 * - Some differences exist:
 *   - DACP uses "AppLaunchFailed" but FDC3 uses "ErrorOnLaunch" for the same concept
 *   - DACP uses generic "ChannelError" which doesn't map to a specific FDC3 enum value
 * - The sendDACPErrorResponse utility accepts BrowserTypes.ResponsePayloadError (FDC3 enums are valid)
 * - When using these error classes, the FDC3 enum value is extracted and used in DACP responses
 */

/**
 * Base class for FDC3-specific errors with error type information
 */
export class FDC3ResolveError extends Error {
  constructor(
    public readonly errorType: ResolveError,
    message: string,
  ) {
    super(message)
    this.name = "FDC3ResolveError"
  }
}

/**
 * Error thrown when no apps are found to handle an intent
 */
export class NoAppsFoundError extends FDC3ResolveError {
  constructor(message: string) {
    super(ResolveError.NoAppsFound, message)
  }
}

/**
 * Error thrown when target app is not available
 */
export class TargetAppUnavailableError extends FDC3ResolveError {
  constructor(message: string) {
    super(ResolveError.TargetAppUnavailable, message)
  }
}

/**
 * Error thrown when target instance is not available
 */
export class TargetInstanceUnavailableError extends FDC3ResolveError {
  constructor(message: string) {
    super(ResolveError.TargetInstanceUnavailable, message)
  }
}

/**
 * Error thrown when intent delivery fails
 */
export class IntentDeliveryFailedError extends FDC3ResolveError {
  constructor(message: string) {
    super(ResolveError.IntentDeliveryFailed, message)
  }
}

/**
 * Error thrown when user cancels intent resolution
 */
export class UserCancelledError extends FDC3ResolveError {
  constructor(message: string) {
    super(ResolveError.UserCancelled, message)
  }
}

/**
 * FDC3 3.0: thrown when a new intent listener conflicts with an existing listener
 * for the same intent on the same instance.
 */
export class IntentListenerConflictError extends FDC3ResolveError {
  constructor(message: string) {
    super(
      (ResolveError as { IntentListenerConflict?: ResolveError }).IntentListenerConflict ??
        ("IntentListenerConflict" as ResolveError),
      message,
    )
  }
}

// ============================================================================
// OPEN ERRORS (for fdc3.open operations)
// ============================================================================

/**
 * Base class for FDC3 Open errors
 */
export class FDC3OpenError extends Error {
  constructor(
    public readonly errorType: OpenError,
    message: string,
  ) {
    super(message)
    this.name = "FDC3OpenError"
  }
}

/**
 * Error thrown when app is not found in directory
 */
export class AppNotFoundError extends FDC3OpenError {
  constructor(message: string) {
    super(OpenError.AppNotFound, message)
  }
}

/**
 * Error thrown when app fails to launch
 * Note: DACP uses "AppLaunchFailed" but FDC3 uses "ErrorOnLaunch"
 * This class uses the FDC3 enum value which should be accepted by DACP
 */
export class ErrorOnLaunchError extends FDC3OpenError {
  constructor(message: string) {
    super(OpenError.ErrorOnLaunch, message)
  }
}

// ============================================================================
// CHANNEL ERRORS (for channel operations)
// ============================================================================

/**
 * Base class for FDC3 Channel errors
 */
export class FDC3ChannelError extends Error {
  constructor(
    public readonly errorType: ChannelError,
    message: string,
  ) {
    super(message)
    this.name = "FDC3ChannelError"
  }
}

/**
 * Error thrown when channel is not found
 */
export class NoChannelFoundError extends FDC3ChannelError {
  constructor(message: string) {
    super(ChannelError.NoChannelFound, message)
  }
}

/**
 * Error thrown when channel access is denied
 */
export class ChannelAccessDeniedError extends FDC3ChannelError {
  constructor(message: string) {
    super(ChannelError.AccessDenied, message)
  }
}

/**
 * Error thrown when channel creation fails
 */
export class ChannelCreationFailedError extends FDC3ChannelError {
  constructor(message: string) {
    super(ChannelError.CreationFailed, message)
  }
}

/**
 * DACP/desktop-agent: context listener id is unknown or not owned by this instance.
 * Wire value is `ChannelError.InvalidArguments` — the listener id passed to the API call is
 * not a valid argument, and `ResponsePayloadError` has no dedicated "listener not found" member.
 */
export class ListenerNotFoundChannelError extends FDC3ChannelError {
  constructor(message: string) {
    super(ChannelError.InvalidArguments, message)
  }
}

// ============================================================================
// CLOSE ERRORS (for fdc3.close — FDC3 v3.0)
// ============================================================================

/** FDC3 v3.0 CloseError enum (not yet exported from @finos/fdc3 2.2). */
export enum CloseError {
  ErrorOnClose = "ErrorOnClose",
  ApiTimeout = "ApiTimeout",
}

/**
 * Base class for FDC3 Close errors
 */
export class FDC3CloseError extends Error {
  constructor(
    public readonly errorType: CloseError,
    message: string,
  ) {
    super(message)
    this.name = "FDC3CloseError"
  }
}

/**
 * Error thrown when the host cannot close the app's window or frame
 */
export class ErrorOnCloseError extends FDC3CloseError {
  constructor(message: string) {
    super(CloseError.ErrorOnClose, message)
  }
}
