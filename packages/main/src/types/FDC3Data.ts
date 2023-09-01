import { DirectoryApp } from '../directory/directory';
import { FDC3Listener } from './FDC3Listener';
import { Context, DisplayMetadata, IntentMetadata } from './FDC3Message';
/**
 * represenation of an FDC3 App - whether it is running (connected) or not (directory only)
 */
export interface FDC3App {
  type: string;
  details: FDC3AppDetail;
  intent?: string;
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
 * cross version representation of channel data
 */
export interface SailChannelData {
  id: string;
  type: 'user' | 'app' | 'private';
  owner?: string;
  displayMetadata?: SailDisplayMetadata;
}

export interface SailPrivateChannelData extends SailChannelData {
  unsubscribeListeners: Map<string, FDC3Listener>;
  disconnectListeners: Map<string, FDC3Listener>;
}


export interface SailDisplayMetadata extends DisplayMetadata {
  /**
   * alternate / secondary color to use in conjunction with 'color' when creating UIs
   */
  color2?: string;
}
