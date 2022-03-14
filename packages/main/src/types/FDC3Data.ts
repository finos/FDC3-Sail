import { Context, DisplayMetadata } from '@finos/fdc3';
import { View } from '../view';

/**
 * Types for data used by the extension
 */

/**
 * Data structure representing the desktop agent environment for an app
 */
export class EnvironmentData {
  currentChannel: string;
  tabId: number;
  directory?: any;

  constructor(tabId: number, currentChannel?: string) {
    this.tabId = tabId;
    this.currentChannel = currentChannel ? currentChannel : 'default';
  }
}

/**
 * represenation of an FDC3 App - whether it is running (connected) or not (directory only)
 */
export interface FDC3App {
  type: string;
  details: FDC3AppDetail;
}

export interface FDC3AppDetail {
  instanceId?: string;
  title?: string;
  directoryData?: DirectoryApp;
}

export interface ResolverDetail {
  intent: string;
  context?: Context;
}

/**
 * Data structure representing an app end point connected to the extension
 */
export interface ConnectedApp {
  id: string;
  content: View;
  directoryData?: DirectoryApp;
  channel?: string;

  /* constructor(id:string, port:chrome.runtime.Port, directoryData?: DirectoryApp ){
        this.id = id;
        this.port = port;
        this.directoryData = directoryData ? directoryData : null;

    }*/
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
  appId: string;
  intents: Array<DirectoryIntent>;
}

export interface DirectoryIcon {
  icon: string;
}

export interface DirectoryIntent {
  name: string;
  display_name: string;
  contexts: Array<string>;
}

/**
 * representation of channel data
 */
export interface Channel {
  id: string;
  type: string;
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
