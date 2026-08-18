---
sidebar_position: 4
---

# Deployment Target: Browser Host

FDC3 Sail's v3-pre runtime is the browser host: `sail-finance` runs a browser-resident `SailDesktopAgent`, and FDC3 web apps connect through WCP and `MessagePort`. Native packaging and deep OS integration are deferred — see [Future: native shell adapter](#future-native-shell-adapter).

## Layered architecture

Package ownership, the two supported entry points, and the layer diagram live on the
[Architecture Overview](./overview#two-entry-points).

The `sail-desktop-agent` package keeps FDC3 state and handlers headless, but the browser-ready path intentionally owns a `BrowserAppConnection`. Use `SailDesktopAgent` for shipping browser hosts; manual `DesktopAgent` composition is for package internals and focused tests.

## Browser / PWA (`sail-finance`)

### What It Is

`sail-finance` is a browser application that can also be installed as a Progressive Web App. It hosts the Desktop Agent in a browser tab/window and exposes it to FDC3 apps running in iframes via the Web Connection Protocol (WCP).

### How It Works

1. User opens the Sail URL (or launches the installed PWA).
2. The Sail UI loads in the browser.
3. FDC3 apps open in iframes within the Sail window.
4. Apps connect to the Desktop Agent via `window.postMessage` (WCP1–3 handshake).
5. After handshake, apps communicate via a dedicated `MessagePort` (WCP4–5).

### Advantages

- **Zero installation for the DA**: Users access the Desktop Agent via a URL — no binary to install.
- **Automatic updates**: The DA updates on every page load without user action.
- **Cross-platform**: Runs wherever Chrome/Edge runs (Windows, macOS, Linux).
- **Developer-friendly**: Standard web debugging tools work out of the box.

### Limitations

- **Sandboxed**: Limited access to OS-level APIs (file system, system tray, OS notifications).
- **Browser restrictions**: Apps must be served over HTTPS in production. Cross-origin restrictions apply.
- **Single window**: All FDC3 apps share the Sail browser window (iframes), limiting independent window management.
- **No native packaging**: Cannot be distributed as a standalone `.exe` or `.dmg` without a wrapper.

### When to Choose DPWA

- You want the simplest possible deployment with no installation step.
- Your FDC3 apps are web-based and don't need deep OS integration.
- You prioritise ease of update and maintenance.
- You're building a SaaS or cloud-hosted desktop agent.

## Future: native shell adapter

Some organisations need OS-level features (native notifications, deep links, system tray, IT-managed installers, air-gapped distribution) that the browser sandbox cannot provide. A native shell — wrapping the same browser host and `SailDesktopAgent` in a desktop runtime — is a valid future direction, but it should be an **explicit adapter** built when that need is concrete, not a promise about the current v3-pre package surface.

Remote Desktop Agent, cross-device sync, and native app connection adapters are deferred on the same basis.

## Related Documentation

- [Architecture Overview](./overview) - Package ownership, entry points, and the layer diagram
- [@finos/sail-desktop-agent](../packages/desktop-agent/overview) - Core FDC3 engine
- [@finos/sail-platform](../packages/platform/overview) - Platform services
