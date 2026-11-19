/**
 * Default FDC3 user channels (fdc3.channel.1–8) for catalog seed when storage is empty.
 */

import { ChannelType, type ChannelState } from "@finos/sail-headless-agent"

export const USER_CHANNELS_STORAGE_KEY = "userChannels"

export const DEFAULT_FDC3_USER_CHANNELS: ChannelState[] = [
  {
    id: "fdc3.channel.1",
    type: ChannelType.user,
    context: [],
    displayMetadata: { name: "Channel 1", color: "#FF0000", glyph: "1" },
  },
  {
    id: "fdc3.channel.2",
    type: ChannelType.user,
    context: [],
    displayMetadata: { name: "Channel 2", color: "#FF8800", glyph: "2" },
  },
  {
    id: "fdc3.channel.3",
    type: ChannelType.user,
    context: [],
    displayMetadata: { name: "Channel 3", color: "#FFFF00", glyph: "3" },
  },
  {
    id: "fdc3.channel.4",
    type: ChannelType.user,
    context: [],
    displayMetadata: { name: "Channel 4", color: "#00FF00", glyph: "4" },
  },
  {
    id: "fdc3.channel.5",
    type: ChannelType.user,
    context: [],
    displayMetadata: { name: "Channel 5", color: "#00FFFF", glyph: "5" },
  },
  {
    id: "fdc3.channel.6",
    type: ChannelType.user,
    context: [],
    displayMetadata: { name: "Channel 6", color: "#0000FF", glyph: "6" },
  },
  {
    id: "fdc3.channel.7",
    type: ChannelType.user,
    context: [],
    displayMetadata: { name: "Channel 7", color: "#FF00FF", glyph: "7" },
  },
  {
    id: "fdc3.channel.8",
    type: ChannelType.user,
    context: [],
    displayMetadata: { name: "Channel 8", color: "#800080", glyph: "8" },
  },
]
