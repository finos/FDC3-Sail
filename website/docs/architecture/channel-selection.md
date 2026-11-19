---
sidebar_position: 4
---

# Channel selection: host chrome vs app-hosted UI

FDC3 user channels can be changed in two ways. Sail supports both at the protocol level; **Sail Web uses host-controlled chrome** by default (`channelSelectorUrl: false` in WCP).

## Roles

| Layer | Responsibility |
|-------|----------------|
| **`sail.fdc3` (`sail.fdc3.channels`)** | Persists the user-channel catalog in FDC3 extension storage; membership get/set/`onAppChannelChange` on the active session. |
| **`sail.fdc3.channelSettings`** | Editor-only `sail.ui.config` UI; writes via `setUserChannels`. Also contributes the channel selector to `sail.ui.app.bar`. |
| **`sail.ui.app.bar`** | Per-app panel header slot. Hosts mount contributions with `properties.instanceId`. |
| **Host (e.g. sail-finance)** | Mounts `sail.ui.app.bar` in the panel header; connection-store mirrors `onAppChannelChange`. |
| **Host (sail-one)** | Tabs are channels: `setUserChannels(tabsToChannelStates(tabs))` then recreate the DA from the catalog. No channels config UI. |

**Principle:** Chrome does not mutate Desktop Agent state by side channel. It uses **`sail.fdc3.channels`** (`changeAppChannel` / catalog APIs); the agent updates membership through the same paths apps use.

## Pattern A — Host-controlled channel UI (Sail default)

**When:** WCP3 handshake sets `channelSelectorUrl: false`.

**Where the UI lives:** `sail.ui.app.bar` contributions in the parent panel header (channel selector + connection indicator).

```text
┌──────────────────────────────────────────────────────────┐
│  Host — panel header: sail.ui.app.bar widgets + host chrome │
│  ┌────────────────────────────────────────────────────┐  │
│  │  App iframe — FDC3 API + business UI only           │  │
│  │  MessagePort ◄──► WCP edge ◄──► DA (sail.fdc3)      │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Catalog

- Owned and persisted by **`sail.fdc3`** (`userChannels` in extension storage).
- Defaults to the eight recommended FDC3 user channels when empty.
- Name, colour, and glyph must each be unique (`setUserChannels` rejects collisions).
- Config UI and sail-one tabs are **writers** through the same API.

### Membership (join / leave)

```typescript
const channels = getExport<SailFdc3Channels>(SAIL_FDC3_CHANNELS)!

await channels.changeAppChannel(instanceId, "fdc3.channel.1")
await channels.changeAppChannel(instanceId, null) // leave

const list = channels.getUserChannels()
const channelId = channels.getAppChannelId(instanceId)

channels.onAppChannelChange(({ instanceId, channelId }) => { /* chrome */ })
```

### Listen for updates

| Consumer | Listen to |
|----------|-----------|
| **Host chrome / connection-store** | `sail.fdc3.channels.onAppChannelChange` |
| **App iframe** | `fdc3.addEventListener("userChannelChanged", …)` |

## Pattern B — App-hosted channel selector URL

**When:** `getChannelSelectorUrl(instanceId)` returns a URL.

Same agent membership handlers; host chrome may still listen to `onAppChannelChange` for indicators but does not initiate joins.

## What not to do

- Bypass the channels export with raw DACP impersonation for host chrome.
- Store a second channel catalog in the config extension — persistence is **only** on `sail.fdc3`.

## Related work

- Architecture overview: [Overview](./overview.md)
- Platform UI points: [`@finos/sail-platform` README](https://github.com/finos/FDC3-Sail/blob/main/packages/sail-platform/README.md)
