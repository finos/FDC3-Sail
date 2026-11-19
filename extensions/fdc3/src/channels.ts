/**
 * Host-facing user-channel catalog + membership (`sail.fdc3.channels`).
 * Catalog is persisted in the FDC3 extension's scoped storage.
 */

import type { SailExtensionStorage } from "@finos/sail-extension"
import { ChannelType, type ChannelState } from "@finos/sail-headless-agent"
import type { SailFdc3Channels, SailFdc3AppChannelChangeEvent } from "./api"
import {
  DEFAULT_FDC3_USER_CHANNELS,
  USER_CHANNELS_STORAGE_KEY,
} from "./default-user-channels"
import type { SailFDC3ServerInstance } from "./SailFDC3ServerInstance"

function cloneCatalog(channels: ChannelState[]): ChannelState[] {
  return channels.map(c => ({
    id: c.id,
    type: ChannelType.user,
    context: [],
    displayMetadata: {
      name: c.displayMetadata?.name ?? c.id,
      color: c.displayMetadata?.color,
      glyph: c.displayMetadata?.glyph,
    },
  }))
}

function assertUniqueDisplayMetadata(channels: ChannelState[]): void {
  const names = new Set<string>()
  const colors = new Set<string>()
  const glyphs = new Set<string>()
  for (const c of channels) {
    const name = c.displayMetadata?.name?.trim()
    const color = c.displayMetadata?.color?.trim()
    const glyph = c.displayMetadata?.glyph?.trim()
    if (!name) {
      throw new Error(`Channel "${c.id}" is missing displayMetadata.name`)
    }
    if (!color) {
      throw new Error(`Channel "${c.id}" is missing displayMetadata.color`)
    }
    if (!glyph) {
      throw new Error(`Channel "${c.id}" is missing displayMetadata.glyph`)
    }
    if (names.has(name)) {
      throw new Error(`Duplicate channel name: ${name}`)
    }
    if (colors.has(color)) {
      throw new Error(`Duplicate channel color: ${color}`)
    }
    if (glyphs.has(glyph)) {
      throw new Error(`Duplicate channel icon/glyph: ${glyph}`)
    }
    names.add(name)
    colors.add(color)
    glyphs.add(glyph)
  }
}

export type SailFdc3ChannelsInternal = SailFdc3Channels & {
  /** Wire membership events from a session agent. */
  bindSession(core: SailFDC3ServerInstance): () => void
}

export async function createSailFdc3Channels(
  storage: SailExtensionStorage,
): Promise<SailFdc3ChannelsInternal> {
  const stored = await storage.get<ChannelState[]>(USER_CHANNELS_STORAGE_KEY)
  let catalog = cloneCatalog(stored?.length ? stored : DEFAULT_FDC3_USER_CHANNELS)
  if (!stored?.length) {
    await storage.set(USER_CHANNELS_STORAGE_KEY, catalog)
  }

  const catalogListeners = new Set<() => void>()
  const membershipListeners = new Set<(e: SailFdc3AppChannelChangeEvent) => void>()
  let activeCore: SailFDC3ServerInstance | null = null
  let unbindCore: (() => void) | null = null

  function emitMembership(event: SailFdc3AppChannelChangeEvent): void {
    for (const listener of membershipListeners) {
      try {
        listener(event)
      } catch {
        // ignore listener errors
      }
    }
  }

  const api: SailFdc3ChannelsInternal = {
    getUserChannels() {
      return cloneCatalog(catalog)
    },

    async setUserChannels(channels) {
      const next = cloneCatalog(channels)
      assertUniqueDisplayMetadata(next)
      catalog = next
      await storage.set(USER_CHANNELS_STORAGE_KEY, catalog)
      for (const listener of catalogListeners) {
        try {
          listener()
        } catch {
          // ignore
        }
      }
    },

    onCatalogChange(listener) {
      catalogListeners.add(listener)
      return () => {
        catalogListeners.delete(listener)
      }
    },

    getAppChannelId(instanceId) {
      return activeCore?.getCurrentChannel(instanceId)?.id ?? null
    },

    getAppChannel(instanceId) {
      const channel = activeCore?.getCurrentChannel(instanceId) ?? null
      if (!channel || channel.type !== ChannelType.user) {
        return null
      }
      return {
        id: channel.id,
        type: ChannelType.user,
        context: [],
        displayMetadata: { ...channel.displayMetadata },
      }
    },

    async changeAppChannel(instanceId, channelId) {
      if (!activeCore) {
        throw new Error("No active FDC3 session for channel membership")
      }
      await activeCore.setUserChannel(instanceId, channelId)
    },

    onAppChannelChange(listener) {
      membershipListeners.add(listener)
      return () => {
        membershipListeners.delete(listener)
      }
    },

    bindSession(core) {
      unbindCore?.()
      activeCore = core
      unbindCore = core.onUserChannelChange(event => {
        emitMembership(event)
      })
      return () => {
        unbindCore?.()
        unbindCore = null
        if (activeCore === core) {
          activeCore = null
        }
      }
    },
  }

  return api
}
