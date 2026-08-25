---
sidebar_position: 3
---

# Add Your App To Sail

Use this guide when you already have a web application and want it to run inside FDC3 Sail or another FDC3 for-the-web Desktop Agent.

Sail-specific work is small:

1. Make your app use the standard `@finos/fdc3` client.
2. Add your app URL and FDC3 metadata to the app directory.
3. Let the Sail host load your app in an iframe or child window.

For the full FDC3 API reference, use the official FDC3 docs. This page explains the Sail hosting expectations around those standards.

## How Sail Loads Apps

Sail is a browser-resident Desktop Agent. Your app normally runs in its own browsing context, usually an iframe inside the Sail workspace. This is what lets different teams ship apps independently with React, Vue, Angular, Svelte, or any other web stack.

Your app does not import Sail packages. It talks to the Desktop Agent through the standard FDC3 client:

```typescript
import { fdc3 } from "@finos/fdc3"

const agent = await fdc3.getAgent()
```

When the app starts, `getAgent()` discovers the Sail host by using the FDC3 Web Connection Protocol. Sail handles the handshake, identity validation, and message routing.

## App Checklist

| Task | Who owns it | Notes |
|------|-------------|-------|
| Serve the app over HTTPS | App team / platform team | Required for production browser deployments. |
| Install `@finos/fdc3` | App team | Use the standard FDC3 client library. |
| Call `fdc3.getAgent()` on startup | App team | Do not reach into parent frames or import Sail internals. |
| Declare app metadata in the app directory | Platform team with app team input | Sail uses this to launch and validate the app. |
| Declare intents and contexts | App team | Required for discovery and intent routing. |
| Test in an iframe/window | App team | Same-page React/Vue components are host UI, not independent FDC3 apps. |

## Minimal App Code

```typescript
import { fdc3 } from "@finos/fdc3"

async function start() {
  const agent = await fdc3.getAgent()

  await agent.addContextListener("fdc3.instrument", context => {
    console.log("received instrument", context)
  })

  await agent.joinUserChannel("fdc3.channel.1")

  await agent.broadcast({
    type: "fdc3.instrument",
    id: { ticker: "AAPL" },
  })
}

void start()
```

For React, Vue, Angular, or Svelte, put this logic in your app startup or a shared FDC3 service. The framework does not matter to Sail as long as the app runs in its own iframe/window and uses `@finos/fdc3`.

## App Directory Entry

Sail needs an FDC3 app directory entry so it can launch your app and validate the URL used during `getAgent()` identity checks.

```json
{
  "appId": "portfolio-view",
  "name": "PortfolioView",
  "title": "Portfolio View",
  "description": "Displays portfolio holdings and reacts to instrument context.",
  "type": "web",
  "details": {
    "url": "https://apps.example.com/portfolio-view/"
  },
  "icons": [
    {
      "src": "https://apps.example.com/portfolio-view/icon.png"
    }
  ],
  "interop": {
    "intents": {
      "listensFor": {
        "ViewPortfolio": {
          "contexts": ["fdc3.portfolio"]
        }
      }
    }
  }
}
```

Important details:

- `appId` is the stable app identifier used by FDC3.
- `details.url` is the URL Sail loads in the iframe or child window.
- The URL origin must match what the app reports during FDC3 web identity validation.
- `interop.intents` tells Sail which intents and context types your app can handle.

See the official [FDC3 App Directory specification](https://fdc3.finos.org/docs/app-directory/spec) for the complete schema.

## Context And Intents

Use FDC3 contexts to describe what the user is looking at, and intents to describe actions another app can perform.

Broadcast context:

```typescript
await agent.broadcast({
  type: "fdc3.instrument",
  name: "Apple Inc.",
  id: {
    ticker: "AAPL",
  },
})
```

Raise an intent:

```typescript
await agent.raiseIntent("ViewChart", {
  type: "fdc3.instrument",
  id: {
    ticker: "AAPL",
  },
})
```

Listen for an intent:

```typescript
await agent.addIntentListener("ViewChart", async context => {
  renderChart(context)
})
```

Use the official FDC3 docs for API detail:

- [GetAgent](https://fdc3.finos.org/docs/api/ref/GetAgent)
- [DesktopAgent API](https://fdc3.finos.org/docs/api/ref/DesktopAgent)
- [Context data](https://fdc3.finos.org/docs/context/spec)
- [Intents](https://fdc3.finos.org/docs/intents/spec)
- [Web Connection Protocol](https://fdc3.finos.org/docs/api/specs/webConnectionProtocol)

## Framework Components vs FDC3 Apps

A React or Vue component rendered inside the same top-level page as Sail is part of the host shell. It cannot become a separate standard FDC3 app through `getAgent()` by itself because there is no parent/opener boundary to discover and no separate browsing context identity.

If you want three independent apps, load three iframe/window documents. They can still be implemented as React/Vue/Svelte apps and served from the same domain or from different domains.

If you want same-page components to call FDC3-like APIs, that requires a Sail-specific adapter or host API, and those components will share host-page identity unless the adapter adds its own component identity model.

## Local Testing

During development, add your app entry to the app directory used by the Sail host, start Sail, and launch the app from the workspace.

The development platform currently uses the `packages/sail-conformance-harness/conformance-appd.json` fixture as an example app directory. For your deployment, point Sail at your own app directory JSON.

## Related Sail Docs

- [Run Sail](./run-sail) for running the full platform.
- [Getting Started](./getting-started) for building a custom Sail host.
- [Desktop Agent integrator guide](./packages/desktop-agent/integrator-guide) for host builders.
