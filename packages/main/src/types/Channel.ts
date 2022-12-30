import { DisplayMetadata } from '@finos/fdc3';
import { FDC3Listener } from '/@/types/FDC3Listener';

/**
 * cross-version
 * metadata for channels
 */

export interface ChannelData {
  id: string;
  type: 'user' | 'app' | 'private' | 'system';
  owner: string | null; //the id of the view which owns the App or Private channel - 'null' if a user/system channel
  displayMetadata?: ChannelMetadata;
}

export interface PrivateChannelData extends ChannelData {
  unsubscribeListeners: Map<string, FDC3Listener>;
  disconnectListeners: Map<string, FDC3Listener>;
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
