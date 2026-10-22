# Sail extensions through FDC3

Status: discussion draft · 12 October 2026

## Purpose

Allow ordinary FDC3 applications to extend Sail's React UI, display pages, and persist state. Use FDC3 app channels, contexts, intents and App Directory (AppD) records rather than introducing a separate executable plugin runtime.

All `sail.*` names and fields below are proposed Sail conventions, not existing FDC3 standard definitions. This document consolidates the discussion and makes proposed defaults explicit. It is not a description of functionality already implemented in Sail.

## Architecture

An extension is an FDC3 app. On startup it registers its intent handlers, context handlers and then broadcasts extension declarations on the `sail.chrome` app channel. Sail maintains a contribution store; React renders that store into toolbar, panel-frame, settings and channel-header slots.

## 1. App lifecycle configuration

Proposed Sail-specific AppD configuration:

```json
{
  "hostManifests": {
    "sail": {
      "invisible": true,
      "singleton": true,
      "autostart": true,
      "searchable": false
    }
  }
}
```

| Field | Default | Meaning |
| --- | --- | --- |
| `invisible` | `false` | Start without a visible panel, using a hidden hosted page connected to FDC3. |
| `singleton` | `false` | Maintain at most one instance per app ID within one Sail session. |
| `autostart` | `false` | Launch the configured app during Sail startup. |
| `searchable` | `true` | Means the app is available to choose in the directory picker (already implemented and used for conformance) |

These settings are independent. Invisible apps can subsequently become visible. Singleton is an instance policy, not a presentation policy. Autostart is deployment-controlled; an arbitrary announcement cannot cause future automatic launches.

Opening or raising an intent to a singleton reuses its instance. If it is starting, concurrent launches share the same pending launch. Intent delivery waits until the handler is ready. Closing its dialog hides the hosted page rather than terminating it. React must preserve the iframe and its browsing context; moving or recreating an iframe can reload it, so the layout implementation must verify instance continuity.

Lifecycle fields live in AppD `hostManifests.sail`, the same host-specific slot Sail already uses for settings such as `forceNewWindow` and `searchable`. They could also live in deployment configuration without changing the runtime protocol.

## 2. The `sail.chrome` app channel

Apps use the channel object directly; they do not change the user's selected channel to register an extension. Sail subscribes before autostarting contributors, then sends a discovery message. Contributors listen for discovery and reannounce after reconnecting.

App channels do not automatically replay existing context when a listener is added. A last-context value cannot reconstruct multiple contributors, so discovery is required.

Sail obtains the source app instance from agent-supplied metadata and lifecycle information. An app ID inside a payload is not proof of the sender's identity. Launching a supplied AppD record remains subject to Sail's normal directory/origin policy.

### Existing Sail DA↔server messages to reuse

The extension protocol is FDC3-facing (`sail.chrome` contexts and intents). The chrome contribution store and React slots should hang off Sail's existing desktop-agent client↔server messages in `sail-v2-common` rather than inventing a parallel host bus:

| Message | Role for extensions |
| --- | --- |
| `app-hello` | App instance connects; source identity for later contributions becomes available. |
| `sail-app-state` | Authoritative connection/lifecycle of instances; drop contributions when an owner disconnects or terminates. |
| `da-launch` / `sail-app-open` | Launch or reopen a target for `display` actions, autostart, and singleton reuse (hosting + channel). |
| `sail-app-close` / `da-app-window-closed` | Close or observe external close of a panel/tab; singleton dialogs hide rather than terminate. |
| `sail-channel-setup` / `sail-channel-change` | Panel user-channel assignment used when framing `sail.window` / `sail.panelState`. |
| `sail-broadcast-context` | Observed user-channel broadcasts; feed bounded session history for channel-context providers. |
| `sail-client-state` (`contextHistory`) | Persisted/synced per-channel context history already carried in DA hello/client state. |
| `sail-intent-resolve` | Existing user-facing resolver; contribution and Sail service intents must target known endpoints and must not open this unexpectedly. |

`da-hello` / `sail-client-state` also carry directories, panels and custom apps used at session restore. Channel-selector UI messages (`channel-receiver-hello` / `channel-receiver-update`) remain internal to Sail chrome widgets unless an extension is explicitly hosting that UI.

## 3. Context catalogue

| Context type | Purpose | Route |
| --- | --- | --- |
| `sail.extension.register` | Declare or replace one extension contribution containing an AppD record. | `sail.chrome` |
| `sail.extension.update` | Update a contribution's dynamic label/icon for a target. | `sail.chrome` |
| `sail.extension.unregister` | Remove a contribution explicitly. | `sail.chrome` |
| `sail.chrome.discover` | Ask connected apps to reannounce contributions. | `sail.chrome` |
| `sail.display` | Request immediate presentation of an app page. | Channel for one-way display; intent for a result |
| `sail.panelState` | Supply app/window identity and authoritative connection state. | Targeted intent delivery |
| `sail.window` | Identify the panel/window affected by an action. | Contribution intent payload |
| `sail.workspace` | Supply workspace context for a contribution action. | Contribution intent payload |
| `sail.channelState` | Identify a user channel and its latest observed context. | Targeted intent delivery |
| `sail.channelHistory` | Return retained user-channel broadcasts. | Intent result |
| `sail.confirmation` | Return an explicit confirmation decision. | Intent result |
| `sail.state` | Read/write/delete a named plugin value. | Storage intent payload/result |
| `sail.operationResult` | Report a display or storage outcome. | Intent result |

The channel state/history contexts and supporting intents below are proposed additions needed to make the discussed indicators implementable; their exact schemas remain to be reviewed.

### Extension declaration

```json
{
  "type": "sail.extension.register",
  "id": { "contributionId": "save-workspace" },
  "extensionPoint": "toolbar",
  "action": "intent",
  "intent": "example.SaveWorkspace",
  "app": {
    "appId": "example.workspace-tools",
    "name": "Save workspace",
    "type": "web",
    "details": { "url": "https://example.com/workspace-tools" },
    "icons": [{ "src": "https://example.com/save.svg" }],
    "interop": {
      "intents": {
        "listensFor": {
          "example.SaveWorkspace": { "contexts": ["sail.workspace"] }
        }
      }
    }
  }
}
```

The registry key is the authenticated contributor instance plus contribution ID. Reannouncing the same key replaces the declaration. The AppD name and icons provide its initial label and image. Multiple contributions are separate announcements. A declaration is not automatically a globally published app-directory entry.

`action` is `intent` or `display`. An intent action names the intent explicitly, avoiding ambiguity when the AppD record advertises several. A display action uses AppD launch details and optional presentation settings. It may also name an intent to deliver after the page connects. These fields stay in the context envelope, not `hostManifests`.

The contributor and displayed app may differ: a background app can announce a separate dialog app. Sail records both ownership and target identity, and validates whether the contributor may register that target.

### Extension points

| Value | Scope | Behaviour |
| --- | --- | --- |
| `toolbar` | Session/workspace | Render an app-labelled button. |
| `window-frame` | Application panel | Render an icon; clicks receive `sail.window`. |
| `settings` | Sail session | Add an entry that displays the app's configuration page. |
| `panel-status` | Application panel | Render a dynamic FDC3 connection indicator. |
| `channel-context` | User channel | Render latest-context summary; click opens history UI. |
| `splash` | Sail startup | Register an available splash page; deployment selects which to show. |

Sail controls placement and ordering. Target filters for frame contributions and provider selection when several apps supply the same indicator remain design decisions. Initial implementation can enable one provider per indicator slot.

### Dynamic update

```json
{
  "type": "sail.extension.update",
  "id": { "contributionId": "channel-summary" },
  "target": { "channelId": "red" },
  "label": "AAPL",
  "icon": "https://example.com/instrument.svg"
}
```

Only the owner can update its contribution. Panel targets use `windowId`; channel targets use `channelId`. Updates change visible state, not ownership or launch identity. Updates to unknown contributions are rejected or ignored with a diagnostic.

Unregistration contains `type: "sail.extension.unregister"` and the contribution ID. Discovery contains `type: "sail.chrome.discover"`. Registrations are also removed when their owner disconnects or terminates; agent lifecycle events, not channel silence, determine this.

### Immediate display

```json
{
  "type": "sail.display",
  "id": { "requestId": "confirmation-123" },
  "presentation": "dialog",
  "width": 480,
  "height": 320,
  "app": {
    "appId": "example.confirmation",
    "name": "Confirm workspace save",
    "type": "web",
    "details": { "url": "https://example.com/confirm-save" }
  },
  "intent": "example.ConfirmWorkspaceSave",
  "context": {
    "type": "sail.workspace",
    "id": { "workspaceId": "workspace-123" }
  }
}
```

Presentation values are `dialog`, `popup` and `splash`. Width/height are optional preferences subject to available screen space. Sail opens or reuses the target, presents it, and optionally delivers the nested intent/context after readiness. A singleton's running URL is not silently replaced by a conflicting record.

A broadcast requests one-way display. A caller needing a decision raises `sail.Display` to the configured Sail chrome service. That service awaits the page's intent result and returns it. A supplied request ID correlates operations; it is not an access credential. Repeated display requests with the same caller/request ID must not open duplicate dialogs.

Confirmation results use `sail.confirmation` with `decision: "confirmed"` or `"rejected"`. Dismissal, cancellation, timeout and app failure are distinct operation outcomes, not implied rejection. A result-bearing display request must identify the page intent that returns the result; merely opening a URL cannot provide one.

### Panel and channel data

`sail.window` contains `id.windowId` and an `app` identifier with `appId` and `instanceId`. `sail.panelState` adds `connection`, initially `connecting`, `connected` or `disconnected`. Sail supplies authoritative connection state even when the target app cannot communicate.

`sail.channelState` contains `channelId`, an optional latest context, source metadata and observation timestamp. Extension apps may also listen directly to user-channel broadcasts. Sail retains bounded session history independently of the UI provider and records broadcasts once at the agent boundary. `sail.channelHistory` contains the channel ID and entries with context, source and observation timestamp; retrieval is paginated or limited.

History means broadcasts observed during the current Sail session, not all broadcasts ever sent. Retention limits, cross-channel access and persistence are configurable decisions. Context history is not durable by default.

## 4. Intent catalogue

| Intent | Handler | Input | Result |
| --- | --- | --- | --- |
| `sail.Display` | Sail chrome service | `sail.display` | Page result or `sail.operationResult` |
| `sail.ReadState` | Sail storage service | `sail.state` | Value-bearing `sail.state` or explicit not-found outcome |
| `sail.WriteState` | Sail storage service | `sail.state` | `sail.operationResult` |
| `sail.DeleteState` | Sail storage service | `sail.state` | `sail.operationResult` |
| `sail.UpdatePanelState` | Indicator app | `sail.panelState` | Optional acknowledgement |
| `sail.UpdateChannelState` | Channel-summary app | `sail.channelState` | Optional acknowledgement |
| `sail.GetChannelHistory` | Sail history service | `sail.channelState` identifying a channel | `sail.channelHistory` |

The last three are proposed supporting contracts. Action intents such as `example.SaveWorkspace` and `example.ConfirmWorkspaceSave` remain app-defined and advertised through standard AppD interoperability fields. They are not mandatory Sail intents.

Service intents are targeted to configured Sail service app identities; contribution intents target the registered app and, where appropriate, existing instance. Neither should unexpectedly invoke a user-facing intent resolver. Sail services must be represented by an FDC3 endpoint capable of receiving intents; calling the agent API alone does not create that endpoint.

## 5. Plugin persistence

```json
{
  "type": "sail.state",
  "scope": "application",
  "key": "preferences",
  "schemaVersion": 1,
  "value": { "showContextTypes": true, "historyLimit": 100 }
}
```

| Field | Meaning |
| --- | --- |
| `scope` | `application` or `workspace`. |
| `workspaceId` | Required for workspace scope, checked against permitted workspace access. |
| `key` | Plugin-owned name within its storage namespace. |
| `schemaVersion` | Version of the plugin's stored value schema. |
| `value` | JSON-serialisable value; used for writes and successful reads. |

Read/delete omit value and schema version. Sail derives the namespace from the authenticated caller's app ID and active user/profile, not an app ID supplied in the payload. Workspace scope adds workspace identity. Instance IDs are not persistence keys.

Sail owns persistence and access checks; plugins own value schemas and migrations. Writes initially replace a complete value. Missing state, failed writes and quota errors are explicit. Concurrency/version guards are an open decision before allowing multiple writers to one namespace.

Use Sail's existing storage backend initially. `localStorage` survives browser sessions; `sessionStorage` does not. A storage abstraction permits later IndexedDB or server-backed persistence without changing these intent contracts. Local storage should not hold secrets. Workspace export/import/reset should include workspace-scoped plugin state; application preferences remain separate.

## 6. React integration

The channel adapter validates messages and mutates a contribution store. React components subscribe to that store rather than reading channels during render. UI actions delegate to one activation service for app launch/reuse, intent delivery and page presentation.

Store entries retain owner instance, contribution ID, AppD target, extension point, action and per-target dynamic state. App lifecycle notifications remove stale contributions. Discovery rebuilds the store after Sail chrome restarts. Pending display requests are managed separately from persistent contribution declarations.

## 7. First implementation and unresolved choices

First implementation: lifecycle configuration; `sail.chrome` discovery and declaration; contribution store; toolbar/settings/window-frame slots; iframe popup host; singleton instance reuse; storage service. Then add panel-status and channel-context providers with bounded history.

Before implementation, settle:

- Exact lifecycle field names and defaults under `hostManifests.sail`.
- Sail service endpoint app IDs and reliable source identity metadata.
- Whether announcements may introduce launchable records or must reference approved directory entries.
- Target filters, ordering and competing provider selection.
- Hosted iframe lifecycle, dialog cancellation and request timeout policy.
- Storage limits, write concurrency and history retention limits.
- JSON Schemas and a protocol compatibility/version policy.

## References

- [FDC3 App Directory 3.0](https://fdc3.finos.org/docs/3.0/app-directory/api)
- [FDC3 App Directory 2.2](https://fdc3.finos.org/docs/2.2/app-directory/api)
- [FDC3 Channel API](https://fdc3.finos.org/docs/api/ref/Channel)
- [FDC3 API specification 2.2](https://fdc3.finos.org/docs/2.2/api/spec)

The references establish the underlying FDC3 mechanisms. The Sail protocol, lifecycle fields and UI behaviour in this document are new design proposals.
