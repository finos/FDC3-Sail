import { ChannelError, OpenError, ResolveError } from 'fdc3-2.0';

/* OPEN */

// this is the same in 1.2 and 2.0
export const AppNotFound = OpenError.AppNotFound;

// this is the same in 1.2 and 2.0
export const AppTimeout = OpenError.AppTimeout;

// this is the same in 1.2 and 2.0
export const ErrorOnLaunch = OpenError.ErrorOnLaunch;

/* CHANNEL */ 

// this is the same in 1.2 and 2.0
export const CreationFailed = ChannelError.CreationFailed;

// this is the same in 1.2 and 2.0
export const AccessDenied = ChannelError.AccessDenied;

/* RESOLVE */

// this is the same in 1.2 and 2.0
export const NoAppsFound = ResolveError.NoAppsFound;

// this is the same in 1.2 and 2.0
export const ResolverTimeout = ResolveError.ResolverTimeout;

// this is the same in 1.2 and 2.0
export const ResolverUnavailable = ResolveError.ResolverUnavailable

// only 2.0
export const TargetInstanceUnavailable = ResolveError.TargetInstanceUnavailable;

// only 2.0
export const TargetAppUnavailable = ResolveError.TargetAppUnavailable;
