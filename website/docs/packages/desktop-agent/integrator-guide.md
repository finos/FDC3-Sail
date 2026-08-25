---
sidebar_position: 2
title: Integrator guide
---

# Browser edge and Desktop Agent

This document is the **primary integrator guide** for embedding the Sail Desktop Agent in a browser host. The package implements two cooperating roles:

1. **Browser app connection** — everything that talks to child app browsing contexts (WCP, MessagePort, per-app routing).
2. **Desktop Agent (DA)** — headless FDC3 logic (DACP handlers, channel state, intents, instance registry).

Most hosts should use `SailDesktopAgent` from the package root. It owns both roles and exposes host controllers for the shell UI.

## Two-box model

```text
┌──────────────────── BROWSER APP CONNECTION ──────────────────────┐
│  Host shell: iframes, AppLauncher, optional IntentResolver UI    │
│  BrowserAppConnection (app-connection/)                          │
│    • WCP1–3 handshake (postMessage + MessageChannel)             │
│    • MessagePort per connected app                               │
│    • Routes DACP by meta.destination.instanceId                  │
└────────────────────────────┬─────────────────────────────────────┘
                             │ attached app connection
                             ▼
┌────────────────────────── DESKTOP AGENT ─────────────────────────┐
│  DesktopAgent (agent/)                                           │
│    • All fdc3.* behaviour via DACP handlers                      │
│    • WCP4–5 identity validation → validated instanceId           │
│    • Channel membership, intents, open-with-context, heartbeat   │
└──────────────────────────────────────────────────────────────────┘
```

| Role | Package path | Speaks to |
|------|--------------|-----------|
| Browser edge | `src/app-connection/` (incl. `wcp/`) | iframe or child-window apps (WCP + MessagePort) |
| Desktop Agent | `src/agent/`, `src/handlers/`, `src/state/` | Host controllers and attached app connections |

Apps never talk to `DesktopAgent` directly. In browser hosts, app traffic flows **MessagePort → BrowserAppConnection → DesktopAgent → AppConnectionRegistry → MessagePort**.

## One Desktop Agent per context

FDC3 assumes **one logical Desktop Agent per user session** — one channel graph, one app instance registry, one intent resolution flow. `@finos/sail-desktop-agent` does not enforce that globally: tests and advanced setups may construct multiple `DesktopAgent` instances. **Browser host integrators must enforce a singleton** on the host page.

| Context | Singleton scope | Typical pattern |
|---------|-----------------|-----------------|
| Browser host page | One agent per top-level `window` (tab) | Module-level holder or `window` property |

Creating two agents in the same browser tab yields **split-brain**: duplicate WCP listeners, conflicting instance registries, and channel UI that reads the wrong agent.

### Browser tab singleton

Hold the `SailDesktopAgent` once for the lifetime of the host page. HMR and strict-mode double mount in dev may call your factory twice — guard with a module-level or `window` holder:

```typescript
import { SailDesktopAgent } from "@finos/sail-desktop-agent"
import type { AppLauncher } from "@finos/sail-desktop-agent"

declare global {
  interface Window {
    __sailDesktopAgent?: SailDesktopAgent
  }
}

function createAgent(appLauncher: AppLauncher) {
  return new SailDesktopAgent({ appLauncher })
}

export function getBrowserDesktopAgent(appLauncher: AppLauncher) {
  if (!window.__sailDesktopAgent) {
    window.__sailDesktopAgent = createAgent(appLauncher)
  }
  return window.__sailDesktopAgent
}

// Host bootstrap (once)
const desktopAgent = getBrowserDesktopAgent(myAppLauncher)
const { intentResolver, channels, apps } = desktopAgent

// Teardown when the host shell unmounts (SPA route change, logout, etc.)
export function destroyBrowserDesktopAgent() {
  window.__sailDesktopAgent?.stop()
  window.__sailDesktopAgent = undefined
}
```

Construct **one** agent handle per host page and reuse it for intent, channel, and app controllers.

### Server, worker, native, and multi-device paths (deferred)

On **v3-pre**, the supported product path is **one browser-resident Desktop Agent per host page**. FDC3 web apps connect via WCP and per-app `MessagePort`; `SailDesktopAgent` couples the in-tab engine and browser app connection.

The following are **not** current adoption paths:

| Scenario | Status on v3-pre | Direction |
|----------|------------------|-----------|
| Remote DA (Node server, Web Worker hosting the engine) | **Removed** — `createWCPClient` preset deleted (BFDA-02) | Future bridge/relay/sync architecture if multi-device coordination is needed |
| Cross-tab or cross-device channel sync | **Deferred** | Explicit sync/relay layer on top of browser-first DA — not by remoting the core agent |
| Native desktop apps (native shell, C++ host) | **Future adapter** | WebSocket or platform-specific **app-connection** transport — native apps join the same channel graph; remoting the DA is not required |

This package's own tests inject a lighter test edge via the `appConnection` constructor option (`new SailDesktopAgent({ appConnection: testEdge })`) instead of standing up the real browser WCP transport — an internal test-only construction path, not a public integration path. See [How to wire](#how-to-wire).

### Host channel UI and `getState()`

Channel chrome must use **push events plus granular getters**, not full state snapshots. Use `channels.onAppChannelChange` / `channels.getAppChannelId` on `SailDesktopAgent`. Do **not** poll or mutate `desktopAgent.getState()` for UI — that API is for tests and debugging only.

Details: [Channel selector — host shell UI](#channel-selector--host-shell-ui) and [Channel selection architecture](../../architecture/channel-selection.md).

## Host contract example

FDC3 in the browser is three runtime parts. Only the bottom two come from this package; **your host shell** wires the contracts in the middle.

```text
  FDC3 Apps          Your host (contracts + controllers)   FDC3 engine
  @finos/fdc3    →   launcher · intentResolver · channels  →   new SailDesktopAgent()
  getAgent()         apps · channel UI · lifecycle              (app connection + DA)
                     open/close · catalog
```

Iframe apps call `fdc3.getAgent()` via `@finos/fdc3` — you do not implement that layer. You **do** implement the host contracts below, then pass them to `SailDesktopAgent`. Host shell UI (intent picker, channel toolbar, app catalog, tab lifecycle) uses the **grouped host controllers** on the agent handle — Sail APIs, not FDC3 wire messages.

### Browser mode (engine in same tab)

```typescript
import { SailDesktopAgent } from "@finos/sail-desktop-agent"
import type { AppLauncher } from "@finos/sail-desktop-agent"

const appShell = document.getElementById("app-shell")!

// --- Host contract: open / close browsing contexts (required) ---

const appLauncher: AppLauncher = {
  async launch(request, app) {
    const instanceId = request.app?.instanceId ?? crypto.randomUUID()
    const iframe = document.createElement("iframe")
    iframe.name = instanceId // MUST match WCP4 identity — host ↔ engine link
    iframe.src = app.type === "web" ? (app.details?.url as string) : ""
    iframe.dataset.appId = app.appId
    appShell.appendChild(iframe)
    return { appId: app.appId, instanceId }
  },
  // FDC3 v3.0: invoked when an app calls fdc3.close() — app-initiated self-close
  async close(instanceId) {
    appShell.querySelector(`iframe[name="${instanceId}"]`)?.remove()
  },
}

const desktopAgent = new SailDesktopAgent({
  appLauncher,
  // appConnectionOptions omitted → intentResolverUrl/channelSelectorUrl false (host-owned UI)
})
desktopAgent.start() // construction only builds the object — start the app connection explicitly

// Grouped host controllers — primary setup pattern for browser hosts
const { intentResolver, channels, apps } = desktopAgent

// Runtime app catalog (primary — not only constructor appDirectories)
await apps.addDirectory("/apps.json")
// apps.add(singleApp) or apps.addAll([...]) for inline entries

// Intent resolver — host chrome via grouped controller
intentResolver.onRequest(request => {
  void showIntentPicker(request.choices ?? []).then(choice => {
    if (choice) intentResolver.select(request.requestId, choice)
    else intentResolver.cancel(request.requestId)
  })
})

// Channel chrome (default: host toolbar, not WCP3 iframe injection)
const userChannels = channels.getUserChannels()
const currentId = channels.getAppChannelId(activeInstanceId)
await channels.changeAppChannel(activeInstanceId, "fdc3.channel.1")
channels.onAppChannelChange(({ instanceId, channelId }) => {
  updateTabChrome(instanceId, channelId)
})

// Instance lifecycle — prefer controller subscriptions over lower-level appConnection hooks
apps.onConnect(meta => tabs.markConnected(meta.instanceId, meta.appId))
apps.onDisconnect(instanceId => {
  tabs.remove(instanceId)
  appShell.querySelector(`iframe[name="${instanceId}"]`)?.remove()
})
apps.onHandshakeFailure(({ error, connectionAttemptUuid }) => {
  console.error("WCP handshake failed", connectionAttemptUuid, error)
})

// Host tab close — host teardown, not fdc3.close() from the host page
function closeAppTab(instanceId: string) {
  appShell.querySelector(`iframe[name="${instanceId}"]`)?.remove()
  apps.disconnect(instanceId)
}

// Host-initiated open from your launcher UI
await apps.open("portfolio-app", { context: instrumentContext })

// desktopAgent.stop() when tearing down the host
```

| Host concern | Required? | Primary API |
|--------------|-----------|-------------|
| `appLauncher` | **Yes** — FDC3 `open()` creates iframes/windows | `new SailDesktopAgent({ appLauncher })` |
| App catalog | **Yes** — metadata for open/intent resolution | `apps.addDirectory`, `apps.add` / `apps.addAll` (or constructor `appDirectories` / `apps`) |
| Intent resolver UI | When multiple handlers match | `intentResolver.*` |
| Channel chrome | Recommended when `channelSelectorUrl` is false (default) | `channels.getUserChannels`, `channels.changeAppChannel`, `channels.onAppChannelChange` |
| Instance lifecycle | Recommended — tabs, cleanup | `apps.onConnect` / `onDisconnect` / `onHandshakeFailure`; host tab close via `apps.disconnect` |
| App self-close | When supporting FDC3 v3.0 `fdc3.close()` | `AppLauncher.close` on the launcher you pass to the preset |

`new SailDesktopAgent(...)` only builds the object — it does not attach `window` listeners. Call `desktopAgent.start()` once setup (catalog, controllers) is wired to install the WCP listener. Stop the agent with `desktopAgent.stop()` when the host shell tears down.

> The `appLauncher` above implements the `AppLauncher` contract directly, which is what this package
> defines and expects — there is no wrapper class to learn. Both `sail-finance`
> (`src/main.tsx`) and `sail-one` (`src/state/sail-host.ts`) implement it inline this way. Note that
> `launch` mints the instance id when `request.app.instanceId` is absent, and the id you render with is
> the id WCP4 later adopts.

### FDC3 boundary

| Who | API |
|-----|-----|
| **Apps** (iframe / child window) | `@finos/fdc3` — `getAgent()`, `joinUserChannel`, `broadcast`, `raiseIntent`, `fdc3.close()`, … |
| **Host shell** (your page) | Sail host controllers — `intentResolver`, `channels`, `apps` on the `SailDesktopAgent` handle |

Apps must not import `@finos/sail-desktop-agent`. Host code must not call `fdc3.close()` on behalf of an app — use `apps.disconnect` for host-initiated teardown and implement `AppLauncher.close` for app-initiated `fdc3.close()`.

### Host controllers reference

Grouped controllers are attached to every `SailDesktopAgent` handle. Destructure once and pass slices to your UI layer.

| Controller | Key methods | Notes |
|------------|-------------|-------|
| **`intentResolver`** | `onRequest`, `select`, `cancel`, `getPendingRequests` | Host chrome when raiseIntent is ambiguous |
| **`channels`** | `getUserChannels`, `getAppChannelId`, `getAppChannel`, `changeAppChannel`, `onAppChannelChange` | Host channel chrome — not raw DACP impersonation |
| **`apps`** | `addDirectory`, `add`, `addAll`, `remove`, `getAll`, `getById`, `open`, `getInstances`, `getInstance`, `getConnections`, `getConnection`, `disconnect`, `onConnect`, `onDisconnect`, `onHandshakeFailure` | Runtime catalog + instance lifecycle; no `apps.close` |

Constructor `appDirectories` / `apps` still work for static seeding; **`apps.addDirectory` and `apps.add` are the primary runtime pattern** when the catalog loads after host init or changes over time.

### Unsubscribe pattern (framework-neutral)

Controller subscription methods return an unsubscribe function. Call it when your UI unmounts or the listener is no longer needed.

**React:**

```typescript
useEffect(() => {
  const offConnect = apps.onConnect(meta => setTabs(t => [...t, meta]))
  const offChannel = channels.onAppChannelChange(e => setChannel(e.channelId))
  const offIntent = intentResolver.onRequest(req => setPending(req))
  return () => {
    offConnect()
    offChannel()
    offIntent()
  }
}, [apps, channels, intentResolver])
```

**Vanilla:**

```typescript
const offDisconnect = apps.onDisconnect(id => removeTab(id))
// later, when tearing down the host shell:
offDisconnect()
```

**Svelte / Vue:** store the returned function and call it in `onDestroy` / `onUnmounted` (or when replacing the listener).

## `getAgent()` discovery support

FDC3 `getAgent()` supports more than one web mechanism. Sail's browser host implements the browser-resident **proxy** mechanism: a child app sends `WCP1Hello` with `postMessage`, Sail replies with `WCP3Handshake`, and app API calls then travel over a `MessagePort` using DACP.

| Scenario | Does standard `getAgent()` find Sail? | What to do |
|----------|---------------------------------------|------------|
| App in an iframe owned by the Sail host | Yes. This is the primary and tested browser path. | Set the iframe `name` to the host instance id and list the app URL in the app directory. |
| App opened with `window.open` by the Sail host | Can work if the child keeps `window.opener` and the app directory identity matches. | Implement a window-based `AppLauncher`; this is not the default `sail-finance` launcher. |
| App in a traditional preload-style container | `getAgent()` can return `window.fdc3` when the container injects it. | This is a different FDC3 web interface. `SailDesktopAgent` does not currently install `window.fdc3` into the host page. |
| React component rendered in the same top-level page as the Sail host | No, not as a separate standard FDC3 app. There is no parent/opener for proxy discovery, and no Sail preload object is installed. | Treat it as host UI and use the `SailDesktopAgent` host APIs, or put it in an iframe/window. |

This is the key difference for teams coming from preload-style desktop agents: in the browser-resident model, independent apps usually need independent browsing contexts. Same-page components can still participate in the product UI, but they are not separate FDC3 app instances through `@finos/fdc3` unless Sail later provides a dedicated top-level adapter.

The browsing-context boundary is also a feature. A Sail host can embed apps from different teams and technology stacks side by side: React, Vue, Angular, Svelte, or plain JavaScript. Each app owns its bundle and deployment URL; Sail owns launch, identity, channels, intents, and lifecycle.

### App code

Application code should stay vendor-neutral and use the FDC3 package:

```typescript
import { fdc3 } from "@finos/fdc3"

const agent = await fdc3.getAgent()

await agent.addContextListener("fdc3.instrument", context => {
  console.log("instrument context", context)
})

await agent.broadcast({
  type: "fdc3.instrument",
  id: { ticker: "AAPL" },
})
```

Host code supplies the app directory and launches the app. App code should not import `@finos/sail-desktop-agent`, inspect parent windows, or manually speak DACP.

### Same-page components

If your "app" is a React component rendered inside the same page that created `SailDesktopAgent`, it is part of the host shell. Use the host APIs already available in that process:

```typescript
const agent = new SailDesktopAgent({ appLauncher, intentResolver })
agent.start()

const userChannels = agent.channels.getUserChannels()
const currentChannel = agent.channels.getAppChannelId(instanceId)
await agent.channels.changeAppChannel(instanceId, "fdc3.channel.1")
```

If you need those components to behave like independent FDC3 apps with their own identity, listeners, channel membership, and lifecycle, launch each one in an iframe or child window. A future Sail component adapter could provide a direct in-page API, but that would be a Sail-specific integration path rather than the standard `@finos/fdc3` `getAgent()` discovery path.

Installing a global `window.fdc3` object in the host page would not by itself make each component an independent app. Every component would see the same global API and share the same browsing context. Without an additional Sail-owned identity layer, their listeners, channel membership, and app metadata would all belong to one host-page app identity. Multiple component libraries should therefore not each try to install their own `window.fdc3`; that would create competing globals rather than separate FDC3 apps.

### Wiring intent resolver and channel selector UI

FDC3 defines **two different mechanisms** for each UI. Sail and this package default to **host-owned UI** (no iframe injected into the app window).

| UI | Mechanism A — host shell (recommended) | Mechanism B — WCP3 iframe injection |
|----|----------------------------------------|-------------------------------------|
| Intent resolver | `desktopAgent.intentResolver` or low-level `IntentResolver` contract | `appConnectionOptions.intentResolverUrl` — `@finos/fdc3` loads a page **inside the app window** |
| Channel selector | Host toolbar + `channels.changeAppChannel` | `appConnectionOptions.channelSelectorUrl` — `@finos/fdc3` loads a page **inside the app window** |

**Default (omit `appConnectionOptions`):** both URLs are `false` — your host shell owns both UIs. This matches FDC3 when the [browser-resident host](https://fdc3.finos.org/docs/api/specs/browserResidentDesktopAgents) renders chrome outside the app iframe.

#### Intent resolver — host shell UI

When `raiseIntent` or `raiseIntentForContext` is ambiguous, the engine pauses and asks the host to pick one choice. Explicit `AppIdentifier` targets and unambiguous matches bypass this UI.

**Option 1 — grouped controller (recommended):** use `intentResolver` on the `SailDesktopAgent` handle:

```typescript
const desktopAgent = new SailDesktopAgent({ appLauncher })
const { intentResolver } = desktopAgent

const offRequest = intentResolver.onRequest(request => {
  // Open YOUR modal — React dialog, Vue component, native picker, etc.
  void myIntentModal.open({
    context: request.context,
    choices: request.choices ?? [],
  }).then(choice => {
    if (choice) intentResolver.select(request.requestId, choice)
    else intentResolver.cancel(request.requestId)
  })
})

// intentResolver.getPendingRequests() for multi-request UI state
// Call offRequest() on teardown (see Unsubscribe pattern above)
```

The resolver request includes running app instances, launchable app rows, and display metadata from the app directory where available (`title`, `name`, `icons`, `screenshots`, `instanceMetadata`). A selected choice feeds the normal Desktop Agent delivery path: launch if needed, wait for the listener if needed, send the `intentEvent`, and return `IntentResolution` to the raising app.

The `intentResolver` request/response shapes are Sail host UI adapter types, not official FDC3 DACP or WCP wire messages.

**Option 2 — low-level host contract:** provide your own `IntentResolver` if you want to own promise correlation yourself:

```typescript
const desktopAgent = new SailDesktopAgent({
  appLauncher,
  intentResolver: {
    async resolve(request) {
      const choice = await myIntentModal.open({ choices: request.choices ?? [] })
      if (!choice) return null
      return {
        selectedHandler: choice.handler,
        target: {
          appId: choice.handler.app.appId,
          instanceId: choice.handler.instanceId,
        },
        intent: choice.intent.name,
      }
    },
  },
})
```

**Option 3 — injected iframe (uncommon for custom hosts):**

```typescript
new SailDesktopAgent({
  appLauncher,
  appConnectionOptions: { intentResolverUrl: true }, // FINOS reference UI, or a URL string
})
```

No `intentResolver` contract needed — `@finos/fdc3` hosts the picker inside each app window.

#### Channel selector — host shell UI

When `channelSelectorUrl` is `false` (default), the **host** renders channel chrome (toolbar button, per-app dropdown). The app does not get an injected channel iframe.

Use the **`channels`** controller on the `SailDesktopAgent` handle:

1. **List** channels: `channels.getUserChannels()`
2. **Read** current channel: `channels.getAppChannelId(instanceId)` or `channels.getAppChannel(instanceId)` (includes channel object)
3. **Change** channel: `await channels.changeAppChannel(instanceId, channelId | null)`
4. **Listen** for updates: `channels.onAppChannelChange(listener)` — push model; do not poll `getState()`

Do **not** read or mutate `desktopAgent.getState()` for channel chrome. `getState()` is for tests and debugging only.

With **`SailDesktopAgent`** (no platform):

```typescript
const { channels } = desktopAgent

const userChannels = channels.getUserChannels()
const currentId = channels.getAppChannelId(instanceId)

channels.onAppChannelChange(({ instanceId, channelId, channel }) => {
  updateTabChrome(instanceId, channelId, channel)
})

// Host toolbar click handler
channelButton.onclick = () => {
  void channels.changeAppChannel(activeInstanceId, "fdc3.channel.1")
}
```

Keep toolbar state in sync with the push model — do not poll `getState()`:

```typescript
const unsubscribe = agent.channels.onAppChannelChange(({ instanceId, channelId }) => {
  updateTabChrome(instanceId, channelId)
})
```

`ChannelControl` in `host-contracts/` describes the **picker contract** (`selectChannel(request)`); wire your toolbar to call `channels.changeAppChannel` with the chosen channel id. Sail web (`sail-finance`) uses `channels.changeAppChannel` on the `SailDesktopAgent` handle plus push events (`connection-store.ts` subscribes; `ChannelSelector.tsx` reads from the store, not `getState()`).

**Injected channel iframe (uncommon):**

```typescript
new SailDesktopAgent({
  appLauncher,
  appConnectionOptions: { channelSelectorUrl: "/host/channel-selector.html" }, // or true for FINOS reference
})
```

#### End-to-end with Sail web (`sail-finance`)

```text
new SailDesktopAgent({ appLauncher, ... }).start()
  → SailDesktopAgent (browser app connection starts with the agent)
  → SailDesktopAgentProvider wires stores to agent events
  → <IntentResolverDialog /> listens via intent-resolver-store
  → <ChannelSelector instanceId={...} /> calls channels.changeAppChannel
```

See `packages/sail-finance/src/contexts/SailDesktopAgentContext.tsx` for provider wiring.

## FDC3 2.2 alignment

This package implements a [Browser-Resident Desktop Agent](https://fdc3.finos.org/docs/api/specs/browserResidentDesktopAgents) with the split prescribed by FDC3 2.2:

| FDC3 2.2 concept | This package |
|------------------|--------------|
| `getAgent()` / WCP connection | **BrowserAppConnection** — WCP1–3, per-app `MessagePort` |
| DACP over `MessagePort` | **DA** (`DesktopAgent`) — all `fdc3.*` API behaviour |
| WCP4 `ValidateAppIdentity` | **DA** — `app-connection/wcp/wcp-identity-validation.ts` plus handlers |
| WCP5 success / failure | **DA** responds; **BrowserAppConnection** migrates port map to validated `instanceId` |
| WCP6 `Goodbye` | **BrowserAppConnection** drops port; **DA** cleans registry |

Spec references (v2.2):

- [Web Connection Protocol](https://fdc3.finos.org/docs/api/specs/webConnectionProtocol) — handshake, UI URL fields, identity validation
- [Browser-Resident Desktop Agents](https://fdc3.finos.org/docs/api/specs/browserResidentDesktopAgents) — host shell responsibilities
- [Desktop Agent Communication Protocol](https://fdc3.finos.org/docs/api/specs/desktopAgentCommunicationProtocol) — DACP request/response routing via `meta.source` / `meta.destination`

### WCP phases (spec vs implementation)

| Step | FDC3 2.2 requirement | Owner in this package |
|------|------------------------|------------|
| WCP1 `Hello` | App posts to parent; includes `connectionAttemptUuid` | App (`@finos/fdc3`); edge listens |
| WCP3 `Handshake` | DA returns `MessagePort` + `intentResolverUrl` + `channelSelectorUrl` | BrowserAppConnection sends; values from `appConnectionOptions` |
| WCP4 | First message on port; `identityUrl` / `actualUrl` origins MUST match `WCP1` origin | DA validates |
| WCP4 reconnect | Optional `instanceId` + `instanceUuid`; DA MUST verify `instanceUuid` secret and `WindowProxy` | DA (`instance-identity-registry`) |
| WCP5 | DA assigns or reuses `appId`, `instanceId`, `instanceUuid` | DA; edge updates routing |
| DACP | All FDC3 API traffic on validated port | DA handlers; edge routes by `meta.destination.instanceId` |

### Injected UI URLs (`WCP3Handshake` payload)

FDC3 names these fields **`intentResolverUrl`** and **`channelSelectorUrl`** on the WCP3 payload. Each MAY be:

- a **URL string** — `@finos/fdc3` loads that page in an iframe for the app window;
- **`false`** — the app does not need an injected iframe (host or DA provides UI another way);
- **`true`** — use the FINOS reference UI.

This package defaults both to **`false`** when `appConnectionOptions` is omitted. That is spec-compliant when the host renders channel chrome and intent resolution outside injected iframes (see [Channel Selector and Intent Resolver](https://fdc3.finos.org/docs/api/specs/browserResidentDesktopAgents#channel-selector-and-intent-resolver-user-interfaces)).

**Two different “intent resolver” mechanisms:**

| Mechanism | Purpose |
|-----------|---------|
| WCP3 `intentResolverUrl` | iframe URL injected **into the app window** by `@finos/fdc3` |
| `intentResolver` on the `SailDesktopAgent` handle | Host UI methods when DA needs disambiguation; not an official DACP/WCP message |
| `intentResolver` option on `SailDesktopAgent` | Low-level host callback for custom composition |

Most browser hosts use **`false`** for WCP3 URLs and implement resolver/channel UI in the host shell via [host contracts](https://github.com/finos/FDC3-Sail/tree/main/packages/sail-desktop-agent/src/host-contracts).

### Package extensions (not FDC3 API)

These behaviours stay within FDC3 MUSTs but are host conventions supported by this library:

- **`iframe name = launcher instanceId`** — correlates `AppLauncher` output with WCP4; cross-origin iframes may not expose `window.name` to the host (integration tests use same-origin fixtures).
- **Host-adopt path** — `open` registers a `PENDING` instance; WCP4 may claim that `instanceId` before first connect so validated id matches the launcher (supports `open()` returning `instanceId` early).
- **`HostInstanceBinding`** (below) — proposed integrator sugar only; not part of the FDC3 standard.

## Heartbeat and liveness configuration

FDC3 2.2 defines [`heartbeatEvent`](https://fdc3.finos.org/docs/api/specs/desktopAgentCommunicationProtocol#checking-apps-are-alive) / [`heartbeatAcknowledgment`](https://fdc3.finos.org/docs/api/specs/desktopAgentCommunicationProtocol#checking-apps-are-alive) as an optional **Desktop Agent** liveness mechanism — “periodically or on demand,” depending on how the app is connected. Apps respond when the DA sends a heartbeat; there is **no** `getAgent()` parameter to disable it from the app side.

Sail exposes heartbeat as **host-level configuration** on `SailDesktopAgent`. Settings apply to **every** connected instance for that agent — not per app or per entry in the app directory.

| Option | Default | Purpose |
|--------|---------|---------|
| `heartbeatEnabled` | `true` | When `true`, start DACP heartbeat after successful WCP5. When `false`, skip heartbeat timers and `heartbeatEvent` traffic. |
| `heartbeatIntervalMs` | `30_000` | Milliseconds between heartbeat sends (only when enabled). |
| `heartbeatTimeoutMs` | `60_000` | Milliseconds without an ack before the instance is torn down (only when enabled). |

Product defaults live in `packages/sail-desktop-agent/src/agent/default-config.ts` and merge in the `DesktopAgent` constructor via `resolveDesktopAgentConfig()`.

```typescript
import { SailDesktopAgent } from "@finos/sail-desktop-agent"

const desktopAgent = new SailDesktopAgent({
  appLauncher,
  heartbeatEnabled: true, // default — omit to keep enabled
  heartbeatIntervalMs: 30_000,
  heartbeatTimeoutMs: 60_000,
})

// Disable heartbeat when the host relies on WCP6 / MessagePort teardown only
const quietAgent = new SailDesktopAgent({
  appLauncher,
  heartbeatEnabled: false,
})
```

**When to disable:** rare — e.g. local debugging, or a host that implements disconnect detection solely via [WCP6 Goodbye](https://fdc3.finos.org/docs/api/specs/webConnectionProtocol#step-5-disconnection) and port teardown. Production and conformance runs should normally leave heartbeat **enabled**; browser-resident agents often combine heartbeat with WCP6 and other signals.

**Logging vs protocol:** `@finos/fdc3` `getAgent({ logLevels: { proxy: "WARN" } })` hides `"Responding to heartbeat request"` in the browser console only. It does not stop heartbeat on the wire — use `heartbeatEnabled: false` on the host agent for that.

**Tests:** Cucumber uses shorter intervals via world config (`heartbeatIntervalMs` / `heartbeatTimeoutMs`). Vitest edge tests assert no connect-time flood when defaults are applied correctly.

## Connection lifecycle (happy path)

```mermaid
sequenceDiagram
  participant Host as Host shell
  participant Edge as BrowserAppConnection
  participant DA as DesktopAgent
  participant App as App iframe

  Host->>Host: AppLauncher returns instanceId (iframe name)
  App->>Edge: WCP1Hello (postMessage)
  Edge->>App: WCP3Handshake + MessagePort
  App->>Edge: WCP4ValidateAppIdentity (claims host instanceId)
  Edge->>DA: WCP4 (+ temp instanceId)
  DA->>Edge: WCP5 (validated instanceId)
  Edge->>Edge: Migrate temp → validated in port map
  Edge->>App: WCP5 response
  App->>Edge: DACP e.g. joinUserChannel (MessagePort)
  Edge->>DA: DACP + meta.source.instanceId
  DA->>Edge: DACP + meta.destination.instanceId
  Edge->>App: DACP delivered on correct MessagePort
```

**Debugging rule:** follow **one instanceId** from launcher → iframe `name` → WCP4 payload → WCP5 validated → `meta.destination.instanceId`. A break anywhere in that chain produces toolbox `AppTimeout`.

### When `open()` settles

`fdc3.open()` resolves only once the launched app has completed the handshake above. When it
resolves, the app is connected and can be interacted with immediately — you can broadcast to a
channel it subscribed to during its own startup and it will receive it.

| | Waits for the app to connect? |
|---|---|
| `open()` without context | **yes** |
| `open()` with context | yes — also waits for a matching context listener |
| `raiseIntent` launching an app | yes |

If the app never connects, `open()` rejects with FDC3 `AppTimeout` after 15 s rather than hanging.

:::caution Timing change
`open()` without a context used to resolve as soon as the instance was registered, before the app
had loaded. It now waits. Callers that relied on it returning immediately will see it take as long as
the app takes to boot — that is the point of the change, since the previous behaviour handed back an
instanceId for an app that could not yet be talked to.
:::

## Where WCP lives

| Phase | Owner | Location |
|-------|--------|----------|
| WCP1–3 (Hello, Handshake, MessageChannel) | **BrowserAppConnection** | `app-connection/browser-app-connection.ts`, `app-connection/wcp/wcp1-3-handshake.ts` |
| Per-app MessagePort bridge | **BrowserAppConnection** | `app-connection/message-port.ts`, `app-connection/wcp/wcp-message-routing.ts` |
| WCP4–5 (validate identity, validated id) | **DA** | `app-connection/wcp/wcp-identity-validation.ts`, `handlers/open/handlers.ts` |
| WCP6 (Goodbye) | **Both** | BrowserAppConnection disconnects port; DA cleans registry |
| DACP (open, channels, intents, …) | **DA** | `handlers/*` |

Integrators normally touch **`SailDesktopAgent`** and **host contracts** (`AppLauncher`, `IntentResolver`), not WCP internals.

## How to wire

Use this tree instead of reading old README patterns.

```text
Where does the Desktop Agent run?
│
├─ Same browser tab as your host UI (default — 90% of integrators)
│    → new SailDesktopAgent() from @finos/sail-desktop-agent
│    → Implement AppLauncher (iframes + instanceId on iframe name)
│    → Wire host UI via intentResolver, channels, apps controllers
│
└─ Server / worker / multi-tab / native host (not supported on v3-pre)
     → Deferred — see Server, worker, native, and multi-device paths (deferred) above
```

`SailDesktopAgent` is the only entry point — there is no base class to compose manually. Its
constructor takes an optional `appConnection` for injecting a lighter test edge in place of the
real browser WCP transport; that option is how this package's own tests build agents, not a second
public construction path.

| Integrator goal | Entry point | Avoid unless advanced |
|-----------------|-------------|------------------------|
| Ship a browser desktop | `SailDesktopAgent` | — |
| App connection + DA seam tests | `SailDesktopAgent` integration tests, or construct with a custom `appConnection` | Duplicating WCP in app code |
| Remote or multi-device DA | — (not on v3-pre) | `createWCPClient` (removed) |

**Canonical import:** `@finos/sail-desktop-agent`. There are no subpath exports — the app-connection internals are not part of the public API.

## Public API — browser-first surface

### Default path — `SailDesktopAgent`

```typescript
import { SailDesktopAgent } from "@finos/sail-desktop-agent"

const desktopAgent = new SailDesktopAgent({ appLauncher: myLauncher })
const { intentResolver, channels, apps } = desktopAgent

await apps.addDirectory("/apps.json")

intentResolver.onRequest(showIntentResolver)
channels.onAppChannelChange(updateChannelChrome)
apps.onConnect(meta => mountTab(meta))

desktopAgent.start() // iframe apps connect via fdc3.getAgent() only after this
```

Teardown: `desktopAgent.stop()`. Construction never starts the agent — call `.start()` once host setup (catalog, controllers) is wired.

### Browser app connection

`SailDesktopAgent` owns a `BrowserAppConnection` exposed as `desktopAgent.appConnection`:

- `desktopAgent.start()` also starts the browser app connection (`window` listener for WCP1, MessagePort routing)
- `desktopAgent.stop()` tears down the app connection and disconnects app instances

Most application code should not call lower-level `appConnection` methods directly. Host code uses grouped controllers (`intentResolver`, `channels`, `apps`) plus `appLauncher`. Optional `onAppConnected` / `onAppDisconnected` callbacks remain for compatibility — prefer `apps.onConnect` / `apps.onDisconnect`.

`BrowserAppConnection` itself is internal — it is not constructible from the public API.

### `appConnectionOptions` — injected UI URLs (uncommon)

Most browser hosts omit `appConnectionOptions` — both `intentResolverUrl` and `channelSelectorUrl` default to `false` on every WCP3Handshake (host-owned chrome). When you need FINOS reference or custom iframe UIs:

```typescript
new SailDesktopAgent({
  appLauncher: myLauncher,
  appConnectionOptions: { intentResolverUrl: true, channelSelectorUrl: true },
})

// Custom iframe URLs (same names as FDC3 WCP3 payload fields)
new SailDesktopAgent({
  appLauncher: myLauncher,
  appConnectionOptions: {
    intentResolverUrl: "/host/intent-resolver.html",
    channelSelectorUrl: "/host/channel-selector.html",
  },
})

// Per-instance URLs — keep getters when URL depends on instanceId
new SailDesktopAgent({
  appLauncher: myLauncher,
  appConnectionOptions: {
    getChannelSelectorUrl: id => `/channels?instance=${id}`,
  },
})
```

### Message validation

Inbound DACP and WCP messages are checked against the FDC3 schema from
`@finos/fdc3-schema` — the same generated source the agent types against, so the
validation cannot drift from the FDC3 version this package targets.

```typescript
new SailDesktopAgent({ appLauncher: myLauncher, validation: "strict" })
```

| Mode | Behaviour | Use when |
|------|-----------|----------|
| `"off"` | No validation | Profiling, or you validate upstream |
| `"warn"` *(default)* | Logs the failure, dispatches anyway | Normal operation |
| `"strict"` | Rejects with an FDC3 `MalformedMessage` error | You require spec-conformant clients |

`"warn"` is the default deliberately. Rejecting malformed messages is a behaviour change:
a client library that sends a slightly off-spec shape works today, and `"strict"` would
break it with no warning. Run on `"warn"`, watch the logs, then tighten if you choose.

Validation covers inbound messages only — responses and events the agent produces are
not re-checked on the way out.

Use `SailDesktopAgent` unless you are writing package internals or focused tests. Manual composition must own state binding, lifecycle, and any host controllers you need.

### `appConnectionOptions` — do you need to change anything?

**No.** Omitting `appConnectionOptions` already produces `intentResolverUrl: false` and `channelSelectorUrl: false` on every WCP3Handshake. You do **not** need:

```typescript
appConnectionOptions: {
  getIntentResolverUrl: () => false,
  getChannelSelectorUrl: () => false,
}
```

unless you prefer the explicit form. Static fields (`intentResolverUrl`, `channelSelectorUrl`) mirror the FDC3 payload names and are equivalent to constant getters. Use **`getIntentResolverUrl` / `getChannelSelectorUrl`** only when the URL varies per connection (`instanceId` at handshake time is still `temp-{uuid}` until WCP5).

## Instance identity — today vs proposed

### Today (logic spread across modules)

Identity is correct when these conditions align:

```text
AppLauncher.launch() → instanceId
       ↓
iframe name={instanceId}
       ↓
WCP1Hello → temp-{connectionAttemptUuid} on app connection map
       ↓
WCP4 payload.instanceId + instanceUuid + sourceWindow
       ↓
identity validation: canReuse | canAdoptPendingHost | else createAppInstance
       ↓
WCP5 validated instanceId → app connection migrates MessagePort map temp → validated
       ↓
open-with-context / broadcast / raiseIntent use meta.destination.instanceId
```

Relevant code today:

- Launcher contract: `src/host-contracts/app-launcher.ts`
- Open registers **PENDING**: `src/handlers/open/handlers.ts`
- WCP4 adopt vs mint: `src/app-connection/wcp/wcp-identity-validation.ts`
- Port map migration: `src/app-connection/wcp/wcp-connection-management.ts`, `wcp-message-routing.ts`
- Open-with-context waits on target id: `src/handlers/utils/open-with-context.ts`

```mermaid
flowchart TB
  subgraph today ["Today — implicit pipeline"]
    L1[AppLauncher.instanceId]
    I1[iframe name]
    T1[temp connection id]
    W4[WCP4 handlers — 3 branches]
    C1[validated id]
    R1[routing map]
    L1 --> I1 --> T1 --> W4 --> C1 --> R1
  end
```

### Known limitation — two launches of one appId at the same time

When two instances of the **same** `appId` are launching concurrently, the agent has to decide
whether a still-pending registration is a genuine second launch or the leftover of a launch that was
abandoned. Its only signal is order: a pending registration older than the one that just connected is
treated as abandoned and discarded.

That is correct when a launch really was abandoned. It is wrong in one case:

```text
launch A starts ──┐
launch B starts ──┤
                  └─► B finishes its handshake FIRST
                      → A is discarded, even though A was never abandoned
```

If that happens, the caller waiting on A either receives **B's instanceId**, or waits the full 15 s
and gets `AppTimeout`.

| | |
|---|---|
| **When** | Two instances of one appId launching at once, and the *second* connects first |
| **Symptom** | Two `open()` calls resolve to the same instanceId, or one times out |
| **Workaround** | None host-side today. Staggering same-appId launches avoids the overlap |

Only the host knows whether a browsing context is still alive, and the agent deliberately does not
depend on host or browser specifics, so it cannot currently tell the two cases apart. Ordering is the
best signal available to it.

## Testing model

| Suite | Proves | Does not prove |
|-------|--------|----------------|
| Cucumber + `MockTransport` (~135 `@fdc3_2.2`) | DA / DACP handler behaviour | iframe MessagePort delivery |
| Vitest handler tests | Individual DACP paths | WCP handshake |
| **Edge contract** (`wcp-desktop-agent.integration.test.ts`) | Edge + DA + MessagePort seam | Full FINOS toolbox oracle |

**Edge contract tests** (maintain here):

1. Single app: WCP4 → temp→validated migration (existing).
2. Two apps: user-channel broadcast received on listener app.
3. Host instanceId: open → PENDING → WCP4 adopt → validated === launcher id.
4. Assert `meta.destination.instanceId` on delivered `broadcastEvent`.

Run:

```bash
npm test -w @finos/sail-desktop-agent -- wcp-desktop-agent.integration
```

## Related docs

- [Package overview](./overview)
- [Composition & internals](./composition)
- [Conformance traceability](./conformance)