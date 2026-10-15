/**
 * Default FDC3 user channels per the FDC3 2.2 spec recommendation
 * (fdc3.channel.1 through fdc3.channel.8 with standard displayMetadata).
 *
 * Single source of truth for DesktopAgent defaults and tests that model production.
 */

import type { BrowserTypes } from "@finos/fdc3"

export const DEFAULT_FDC3_USER_CHANNELS: BrowserTypes.Channel[] = [
  {
    id: "fdc3.channel.1",
    type: "user",
    displayMetadata: {
      name: "Channel 1",
      color: "#FF0000",
      glyph: "1",
    },
  },
  {
    id: "fdc3.channel.2",
    type: "user",
    displayMetadata: {
      name: "Channel 2",
      color: "#FF8800",
      glyph: "2",
    },
  },
  {
    id: "fdc3.channel.3",
    type: "user",
    displayMetadata: {
      name: "Channel 3",
      color: "#FFFF00",
      glyph: "3",
    },
  },
  {
    id: "fdc3.channel.4",
    type: "user",
    displayMetadata: {
      name: "Channel 4",
      color: "#00FF00",
      glyph: "4",
    },
  },
  {
    id: "fdc3.channel.5",
    type: "user",
    displayMetadata: {
      name: "Channel 5",
      color: "#00FFFF",
      glyph: "5",
    },
  },
  {
    id: "fdc3.channel.6",
    type: "user",
    displayMetadata: {
      name: "Channel 6",
      color: "#0000FF",
      glyph: "6",
    },
  },
  {
    id: "fdc3.channel.7",
    type: "user",
    displayMetadata: {
      name: "Channel 7",
      color: "#FF00FF",
      glyph: "7",
    },
  },
  {
    id: "fdc3.channel.8",
    type: "user",
    displayMetadata: {
      name: "Channel 8",
      color: "#800080",
      glyph: "8",
    },
  },
]
