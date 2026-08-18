---
sidebar_position: 4
---

# Channel selection: host chrome vs app-hosted UI

FDC3 user channels can be changed in two ways. Sail supports both at the protocol level; **Sail Web uses host-controlled chrome** by default.

For **one agent per browsing context** and why host chrome must not poll `getState()`, see [Integrator guide — One Desktop Agent per context](../packages/desktop-agent/integrator-guide.md#one-desktop-agent-per-context).

## Roles

| Layer | Responsibility |
|-------|----------------|
| **`@finos/sail-desktop-agent`** | FDC3 engine: DACP handlers, agent state, WCP routing, events to apps. Stays **protocol-pure** — no Sail UI, no “chrome” concepts. |
| **`@finos/sail-platform`** | No role here. It holds workspaces, layouts and storage; channels are FDC3 and belong to the agent. |
| **`@finos/sail-finance`** (example host) | React chrome (`ChannelSelector`), connection store, tiles around iframes. |

**Principle:** Parent chrome does not mutate Desktop Agent state directly. It calls the agent's **`channels` controller**; the agent updates state through the same DACP handlers apps use.

## Pattern A — Host-controlled channel UI (Sail default)

**When:** `getChannelSelectorUrl()` returns `false` in WCP3 handshake (Sail-controlled UI).

**Where the UI lives:** Parent window chrome next to each app iframe (one desk, consistent UX).

**Layout:**

```text
┌──────────────────────────────────────────────────────────┐
│  Host (sail-finance) — tabs, channel dots, workspace chrome   │
│  ┌────────────────────────────────────────────────────┐  │
│  │  App iframe — FDC3 API + business UI only           │  │
│  │  MessagePort ◄──► BrowserAppConnection ◄──► DA       │  │
│  └────────────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────────────┘
```

### Set (join / leave) on behalf of an instance

Hosts call **`channels.changeAppChannel(instanceId, channelId | null)`** on the `SailDesktopAgent` handle. There is one path:

1. Send a typed **`joinUserChannelRequest`** or **`leaveCurrentChannelRequest`** with `meta.source.instanceId` set to that app.
2. Desktop Agent handlers update `instance.currentUserChannel`.
3. Agent emits **`channelChangedEvent`** toward the app.
4. WCP routes the event and emits **`channelChanged`** on `appConnection`; the `channels` controller surfaces this via **`onAppChannelChange`**.

This is “on behalf of the app” in **identity** (source instance id), not “bypass FDC3”.

### Get (read) for chrome

| What chrome needs | SailDesktopAgent API | Notes |
|-------------------|----------------------|--------|
| List of user channels | `channels.getUserChannels()` | Reads agent state (not per-app DACP). |
| Current channel for a tile | `channels.getAppChannelId(instanceId)` or `channels.getAppChannel(instanceId)` | No DACP round-trip. |
| Event-driven mirror | `channels.onAppChannelChange(listener)` | Push model — do not poll `getState()`. |

Apps still use **`fdc3.getCurrentChannel()`** inside the iframe over MessagePort — that is the app’s own DACP `getCurrentChannelRequest`.

### Listen for updates

| Consumer | Listen to |
|----------|-----------|
| **Host chrome** | `channels.onAppChannelChange` on the agent handle, or a store fed by it |
| **App iframe** | `fdc3.addEventListener("userChannelChanged", …)` (FDC3 2.2) |

Both reflect the same agent state change; the host does not need to poke the iframe DOM.

## Pattern B — App-hosted channel selector URL

**When:** `getChannelSelectorUrl(instanceId)` returns a URL (or the app shows its own picker).

**Where the UI lives:** URL loaded in app context (iframe/popup) per FDC3 For-the-Web.

**Flow:**

1. App or selector page sends **`joinUserChannelRequest` / `leaveCurrentChannelRequest`** over the app **MessagePort**.
2. Messages pass **`bridgeAppPort`** validation (`isAppMessage`).
3. Same agent handlers and **`channelChangedEvent`** as Pattern A.

**Host chrome** may still listen to `channelChanged` for a global indicator, but it does **not** initiate joins.

## What not to do

- **Raw DACP impersonation** (`sendDACPMessageOnBehalfOf`, private `handleMessage`) — bypasses WCP validation; use typed **`channels.changeAppChannel`** on `SailDesktopAgent` instead.
- **Chrome writing agent state without DACP handlers** — breaks conformance and app event delivery.

## Channel API surface

```typescript
const { channels } = desktopAgent

await channels.changeAppChannel(instanceId, "fdc3.channel.1")
await channels.changeAppChannel(instanceId, null) // leave

const channelList = channels.getUserChannels()
const channelId = channels.getAppChannelId(instanceId)

const unsubscribe = channels.onAppChannelChange(({ instanceId, channelId }) => { ... })
```

Use **`channels.*`**, not raw `appConnection` delivery or `getAppUserChannelId` alone. Channel state is
FDC3 state and lives in the agent — `@finos/sail-platform` stores which tab a panel sits in, which is
a different question from which channel its app has joined.

## Related work

- Integrator singleton + channel reactivity: [Desktop Agent integrator guide](../packages/desktop-agent/integrator-guide.md#one-desktop-agent-per-context)
- Architecture overview: [Overview](./overview.md) (Sail-controlled UI)
- Workspaces and layouts: [@finos/sail-platform](../packages/platform/overview)
