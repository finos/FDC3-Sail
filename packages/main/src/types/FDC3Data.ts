import { AppIdentifier, ContextMetadata } from 'fdc3-2.0';
import { DirectoryApp } from '../directory/directory';
import { FDC3Listener } from './FDC3Listener';
import {
  Context,
  DisplayMetadata,
  IntentMetadata,
  SailTargetIdentifier,
} from './FDC3Message';
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
 * Back-end to front-end intent resolution results container.
 */
export interface SailIntentResolution {
  source?: SailTargetIdentifier;
  version: string;
  intent?: string;
  openingResolver: boolean;
  result: string; // event containing the result
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
  onAddContextListeners: Map<string, FDC3Listener>;
}

export interface SailDisplayMetadata extends DisplayMetadata {
  /**
   * alternate / secondary color to use in conjunction with 'color' when creating UIs
   */
  color2?: string;
}

/**
 * This wraps the ContextMetadata used by intent and context handlers.
 * Only used by 2.0
 */
export interface SailContextMetadata extends ContextMetadata {
  resultId: string;
}
