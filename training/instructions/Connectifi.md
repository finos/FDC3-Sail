# Connectifi

The [Connectifi](https://connectifi.co) service enables secure FDC3 interoperability in browsers, desktop containers, native applications, and across devices. The fastest way to get started is to run the Connectifi Agent in a browser and point to our hosted Sandbox directory.

## Getting The Agent

1.  Install The Connectifi NPM Module like this:

```
cd training
npm install @connectifi/agent-web
```

## Using The Agent In the Demo Apps

1.  Add the `getAgent` import to the top of `pricer.ts` and `tradelist.ts`:

```
import { createAgent } from "@connectifi/agent-web";
```

2. Look for the occurrences of `fdc3Ready()` in `pricer.ts` and `tradelist.ts`, and replace them with:

```
createAgent('https://dev.connectifi-interop.com','pricer@sandbox').then(a => { window.fdc3 = a!! })

createAgent('https://dev.connectifi-interop.com', 'tradelist@sandbox').then(a => { window.fdc3 = a!! })

```

**Note**: Make sure to leave the `.then()` after the original `fdc3Ready()` intact - don't change that part.

## Connectifi Directory Service

Use our FDC3 Sandbox app and demo apps directory to test out FDC3 APIs using Connectifi: https://apps.connectifi-interop.com/sandbox

## Open Source Resources:

There are a number of examples in the getting started open source repo: https://github.com/connectifi-co/getting-started

You can also use our open source project for multiplexing in a micro-frontend setup: https://github.com/connectifi-co/fdc3-web-portal
