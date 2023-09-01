import { ChannelError, OpenError, ResolveError } from 'fdc3-2.0';

// this is the same in 1.2 and 2.0
export const AppNotFound = OpenError.AppNotFound;

// this is the same in 1.2 and 2.0
export const NoAppsFound = ResolveError.NoAppsFound;

// this is the same in 1.2 and 2.0
export const CreationFailed = ChannelError.CreationFailed;
