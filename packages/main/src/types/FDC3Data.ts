import { Context, DisplayMetadata, IntentMetadata } from 'fdc3-1.2';
import { DirectoryApp } from '../directory/directory';
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
 * todo: rationalize with ChannelData interface in Channel.ts
 */
export interface ChannelData {
  id: string;
  type: 'system' | 'user' | 'app' | 'private';
  displayMetadata?: ChannelMetadata;
}

export class ChannelMetadata implements DisplayMetadata {
  /**
   * A user-readable name for this channel, e.g: `"Red"`
   */
  name?: string;

  /**
   * The color that should be associated within this channel when displaying this channel in a UI, e.g: `0xFF0000`.
   */
  color?: string;

  /**
   * A URL of an image that can be used to display this channel
   */
  glyph?: string;

  /**
   * alternate / secondary color to use in conjunction with 'color' when creating UIs
   */
  color2?: string;
}
