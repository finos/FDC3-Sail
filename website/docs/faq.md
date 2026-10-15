---
sidebar_position: 5
---

# Frequently Asked Questions

## What are FDC3 and Sail?

FDC3 is an open standard for interoperability between financial desktop applications. It lets apps share structured context, such as an instrument, and request actions from other apps using intents.

Sail is a browser-based FDC3 Desktop Agent and example platform. It routes those messages between apps and provides a workspace for launching and managing them. Sail supports **FDC3 2.2 and 3.0** wire protocols on the same host: each app negotiates its version during the WCP handshake.

For more background, see the [FDC3 website](https://fdc3.finos.org/), [Run Sail](./run-sail), and [Add your app to Sail](./add-your-app).

## Does Sail support FDC3 3.0?

Yes. The Desktop Agent advertises a maximum wire version of `3.0` by default and keeps a full **2.2** handler set alongside **3.0**. Apps that connect with `@finos/fdc3` continue to use `getAgent()`; Sail picks the matching DACP handlers from the version in `WCP1Hello`. See the [Desktop Agent overview](./packages/browser-agent/overview), [engine BDD inventory](./packages/headless-agent/bdd), and [conformance harness](./packages/conformance-harness/overview).

## What does a Desktop Agent do?

A Desktop Agent coordinates communication between apps. It routes context broadcasts, manages channels, and resolves intent requests to apps that can handle them. Apps use the standard `@finos/fdc3` client API rather than communicating directly with one another.

## Do I need to write code to try Sail?

No. You can run Sail and launch apps from its directory without changing their code. To make your own app participate in FDC3 workflows, use the standard `@finos/fdc3` client and declare its capabilities in an app directory entry. See [Add your app to Sail](./add-your-app).

## How do I run Sail?

Follow [Run Sail](./run-sail) to start the platform from source or build it for hosting. Sail is a browser application; production deployments should use HTTPS.

## How do I add an app?

Sail launches apps listed in an FDC3 app directory. Add an entry with the app URL and its FDC3 metadata, then configure Sail to use that directory. The [app directory entry guide](./add-your-app#app-directory-entry) has an example.

## What happens if one app crashes?

Apps run in separate browser contexts, so a failure in one app should not crash the Sail host or other apps. The failed app may need to be relaunched before it can participate in workflows again.

## How does Sail protect app data?

Sail uses browser app boundaries and the FDC3 Web Connection Protocol to connect apps to the Desktop Agent. Browser isolation and the protocol's identity checks help prevent apps from impersonating other app instances. These mechanisms are not a substitute for reviewing app origins, permissions, and deployment security; see [Security](./architecture/security).

## Does Sail work offline?

Sail's UI can be hosted as a web application, but the apps it launches may require network access to load or fetch data. Apps also need to remain connected to their host to use FDC3 interoperability.

## Where can I learn about building a custom host?

Start with [Getting Started](./getting-started), then use the [Desktop Agent integrator guide](./packages/browser-agent/integrator-guide) for the browser connection and host contracts.
