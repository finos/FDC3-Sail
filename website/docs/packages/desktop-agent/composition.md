---
sidebar_position: 3
title: Composition & internals
---

# Composition & internals

How `@finos/sail-desktop-agent` modules compose and interact. For integration steps and copy-paste examples, see the [integrator guide](./integrator-guide).

## Layered runtime model

```mermaid
flowchart TB
  subgraph apps ["FDC3 apps (external)"]
    A1["iframe app — @finos/fdc3"]
    A2["iframe app — @finos/fdc3"]
  end

  subgraph host ["Your host shell"]
    HL["AppLauncher"]
    HI["intentResolver"]
    HC["channels"]
    HA["apps"]
  end

  subgraph edge ["App connection — app-connection/"]
    WCP["BrowserAppConnection"]
    MP1["MessagePortTransport"]
    MP2["MessagePortTransport"]
    WCP --> MP1
    WCP --> MP2
  end

  subgraph da ["Desktop Agent — agent/handlers/state"]
    DAG["DesktopAgent"]
    H["DACP handlers"]
    S["AgentState"]
    DAG --> H --> S
  end

  A1 <-->|"WCP + MessagePort"| MP1
  A2 <-->|"WCP + MessagePort"| MP2
  host -->|"host contracts"| edge
  HL -.->|"iframe name = instanceId"| A1
  edge --> da
```

**Key rule:** apps never talk to `DesktopAgent` directly. In browser hosts, app traffic flows **MessagePort → BrowserAppConnection → DesktopAgent → AppConnectionRegistry → MessagePort**.

## One construction path

```mermaid
flowchart LR
  P["new SailDesktopAgent(options)"]
  P --> E1["BrowserAppConnection (internal)"]
  P --> D1["DesktopAgent (internal)"]
  E1 --> D1
  P --> C["intentResolver · channels · apps"]
```

`SailDesktopAgent` owns the browser edge, the state binding, and the lifecycle. It is not
an assembly of parts you can swap: it *extends* `DesktopAgent`, and a bare `DesktopAgent`
throws on any DACP routing until an edge is attached.

| You provide | You get |
|-------------|---------|
| `AppLauncher` — mount the iframe with `name = instanceId` | `intentResolver`, `channels`, `apps` controllers plus `start()` / `stop()` |

`AgentAppConnection` — the contract the edge implements — is deliberately not exported.
A replacement edge (WebSocket, native host) would ship as its own package implementing
that contract, at the point one is actually needed.

### Deferred deployment paths (not on v3-pre)

```mermaid
flowchart TB
  subgraph today ["Supported today"]
    B["Browser host page"]
    DA["DesktopAgent in-tab"]
    WCP["BrowserAppConnection + MessagePort per app"]
    B --> DA
    B --> WCP
    WCP --> DA
  end

  subgraph future ["Future explicit adapters"]
    NAT["Native app — WebSocket app-connection"]
    SYNC["Cross-tab / cross-device sync relay"]
    BR["Bridge between browser DA instances"]
    NAT -.->|"app-connection only"| WCP
    SYNC -.->|"on top of browser-first DA"| DA
    BR -.->|"not remote core DA"| DA
  end
```

Remote Desktop Agent (`createWCPClient` + server-hosted engine) was removed from presets. Native desktop apps and multi-device sync are planned as **app-connection** or **sync** adapters — not as a reason to host the core DA on a remote process. See the [integrator guide — deferred paths](./integrator-guide#server-worker-native-and-multi-device-paths-deferred).

## Source tree responsibilities

```text
packages/sail-desktop-agent/src/
│
├── agent/
│   ├── desktop-agent.ts       # DesktopAgent class — start/stop, handler dispatch
│   ├── sail-desktop-agent.ts  # Browser-ready constructor + host controllers
│   └── default-config.ts
│
├── host-contracts/
│   ├── app-launcher.ts        # AppLauncher — host opens iframes/windows
│   ├── intent-resolver.ts     # IntentResolver — disambiguation UI contract
│   └── channel-control.ts     # ChannelControl — picker contract shape
│
├── app-connection/
│   ├── browser-app-connection.ts # WCP listener + MessagePort registry
│   ├── wcp/                   # WCP handshake, routing, connection map
│   └── message-port.ts
│
├── handlers/
├── state/
├── dacp/
│   └── validate-dacp-message.ts  # FDC3 schema validation — off | warn | strict
└── app-directory/
```

## WCP and DACP ownership

```mermaid
sequenceDiagram
  participant App as App iframe
  participant Edge as BrowserAppConnection
  participant DA as DesktopAgent

  Note over App,Edge: WCP1–3 — edge only
  App->>Edge: WCP1Hello (postMessage)
  Edge->>App: WCP3Handshake + MessagePort

  Note over App,DA: WCP4–5 — DA validates, edge migrates port map
  App->>Edge: WCP4 on MessagePort
  Edge->>DA: WCP4ValidateAppIdentity
  DA->>Edge: WCP5 response
  Edge->>App: WCP5 on MessagePort
  Edge->>Edge: temp id → validated id

  Note over App,DA: DACP — DA handlers, edge routes by instanceId
  App->>Edge: joinUserChannelRequest
  Edge->>DA: DACP + meta.source
  DA->>Edge: channelChangedEvent + meta.destination
  Edge->>App: deliver on MessagePort
```

| Phase | Owner | Code location |
|-------|--------|---------------|
| WCP1–3 | Edge | `app-connection/browser-app-connection.ts`, `app-connection/wcp/wcp1-3-handshake.ts` |
| MessagePort bridge | Edge | `app-connection/message-port.ts`, `app-connection/wcp/wcp-message-routing.ts` |
| WCP4–5 | DA (+ edge port migration) | `app-connection/wcp/wcp-identity-validation.ts`, `handlers/open/handlers.ts` |
| WCP6 Goodbye | Both | Edge drops port; DA removes instance |
| DACP (all `fdc3.*`) | DA | `handlers/*` |

## Instance identity pipeline

Toolbox `AppTimeout` usually means a break in this chain:

```mermaid
flowchart LR
  L["AppLauncher.instanceId"]
  I["iframe name"]
  T["temp-{uuid} on edge"]
  W4["WCP4 claim"]
  C["validated instanceId"]
  R["meta.destination.instanceId"]

  L --> I --> T --> W4 --> C --> R
```

| Step | Module |
|------|--------|
| Launcher returns id | `host-contracts/app-launcher.ts` |
| Open registers PENDING | `handlers/open/handlers.ts` |
| WCP4 adopt vs mint | `app-connection/wcp/wcp-identity-validation.ts` |
| Port map migration | `app-connection/wcp/wcp-connection-management.ts` |

## Intent resolution flow

```mermaid
sequenceDiagram
  participant App as Raising app
  participant DA as DesktopAgent
  participant Edge as BrowserAppConnection
  participant Host as Host IntentResolver

  App->>DA: raiseIntentRequest
  DA->>DA: multiple handlers — pause
  DA->>Edge: intentResolverNeeded
  Edge->>Host: event (or preset calls IntentResolver.resolve)
  Host->>Host: show picker UI
  Host->>Edge: resolveIntentSelection
  Edge->>DA: selection
  DA->>App: intent delivered to target
```

Two mechanisms exist for intent UI — see [integrator guide — intent resolver](./integrator-guide#intent-resolver--host-shell-ui):

- **Host shell (default):** `intentResolver` controller or low-level `IntentResolver` contract
- **WCP3 injection:** `appConnectionOptions.intentResolverUrl` — `@finos/fdc3` loads iframe in app window

## Channel change flow (host chrome)

```mermaid
sequenceDiagram
  participant Chrome as Host channel toolbar
  participant Ctrl as channels controller
  participant Edge as BrowserAppConnection
  participant DA as DesktopAgent
  participant App as App iframe

  Chrome->>Ctrl: changeAppChannel(instanceId, channelId)
  Ctrl->>DA: changeAppUserChannel
  DA->>DA: update instance.currentUserChannel
  DA->>Edge: channelChangedEvent
  Edge->>App: userChannelChanged
  Edge->>Ctrl: channelChanged event
  Ctrl->>Chrome: onAppChannelChange callback
```

Browser hosts use **`channels.changeAppChannel`** and **`channels.onAppChannelChange`** — see [integrator guide](./integrator-guide#channel-selector--host-shell-ui).

`SailDesktopAgent` exposes these controllers directly.

## Testing layers

| Layer | Suite | Proves |
|-------|-------|--------|
| DACP handlers | Cucumber + MockTransport (~135 `@fdc3_2.2`) | FDC3 handler behaviour |
| Handler units | Vitest in `dacp/__tests__/` | Individual request paths |
| Edge seam | `wcp-desktop-agent.integration.test.ts` | WCP + MessagePort + DA routing |
| Full oracle | FINOS toolbox via conformance harness | End-to-end browser behaviour |

See [conformance traceability](./conformance) for BDD vs toolbox gaps.

## Related

- [Integrator guide](./integrator-guide) — host contracts, browser-first agent, WCP/DACP detail
- [Channel selection (Sail stack)](../../architecture/channel-selection) — host chrome vs app-hosted selector UI
- [@finos/sail-platform](../platform/overview) — workspaces, layouts, and storage
