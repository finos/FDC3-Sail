import { Context, DisplayMetadata, IntentMetadata } from 'fdc3-1.2';
import { Context, IntentMetadata } from 'fdc3-1.2';

/**
 * representation of an FDC3 App - whether it is running (connected) or not (directory only)
 */
export interface FDC3App {
  type: string;
  details: FDC3AppDetail;
}

/**
 * A collection of apps associated with an intent
 */
export interface IntentInstance {
  intent: IntentMetadata;
  apps: Array<FDC3App>;
}

export interface FDC3AppDetail {
  instanceId?: string;
  title?: string;
  directoryData?: DirectoryApp;
}

export interface ResolverDetail {
  intent?: string;
  context?: Context;
}
