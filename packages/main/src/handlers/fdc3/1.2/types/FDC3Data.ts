import { Context, IntentMetadata } from 'fdc3-1.2';

/**
 * represenation of an FDC3 App - whether it is running (connected) or not (directory only)
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

/**
 * Data structure representing an App Directory item
 */
export interface DirectoryApp {
  name: string;
  title: string;
  start_url: string;
  manifest: string;
  manifest_type: string;
  description: string;
  icons: Array<DirectoryIcon>;
  images: Array<DirectoryImage>;
  appId: string;
  intents: Array<DirectoryIntent>;
}

export interface DirectoryIcon {
  icon: string;
}

export interface DirectoryImage {
  url: string;
}

export interface DirectoryIntent {
  name: string;
  display_name: string;
  contexts: Array<string>;
}
