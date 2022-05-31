[![FINOS - Incubating](https://cdn.jsdelivr.net/gh/finos/contrib-toolbox@master/images/badge-incubating.svg)](https://finosfoundation.atlassian.net/wiki/display/FINOS/Incubating)
![website build](https://github.com/finos/electron-fdc3/workflows/Docusaurus-website-build/badge.svg)

# Electron FDC3 Desktop Agent & App Directory

This project provides a fully open source implementation of the [FDC3](https://fdc3.finos.com) interoperability standard.  Including:
- A fully featured and secure electron desktop agent featuring:
    - intent resolution
    - channel linking
    - directory search
- A local file-based app directory implementation

## FDC3 Primer

If you are an Electron and/or Web Dev new to FDC3, it may be helpful to check out [this primer](FDC3_PRIMER.md).

## Electron Implementation

The Electron implementation is built from the [Vite Electron Builder Boilerplate] (also see [TEMPLATE.md](./TEMPLATE.md)). 

The UI for the desktop agent is built using React MUI.

All remotely hosted content is run in BrowserView following electron security best practices.


## Libraries

The following libraries are used:
- [Electron] cross-platform desktop framework
- [electron-builder] for packaging, distribution and auto-updates
- [Vite] for building, running and hot-reloading
- [React] for UI rendering
- [Vitest] and [React Testing Library] for testing
- [Playwright] for test automation
- [TypeScript]
- [ESLint] for linting
- [Prettier] for code formatting
- [nano-staged] and [simple-git-hooks] for code commits


[Electron]: https://github.com/electron/electron
[electron-builder]: https://github.com/electron-userland/electron-builder
[Vite]: https://github.com/vitejs/vite/
[Vite Electron Builder Boilerplate]: https://github.com/cawa-93/vite-electron-builder
[Vitest]: https://vitest.dev/
[React]: https://reactjs.org/
[MUI]: https://github.com/mui
[React Testing Library]: https://testing-library.com/docs/react-testing-library/intro/
[Typescript]: https://github.com/microsoft/TypeScript/
[Playwright]: https://playwright.dev
[Prettier]: https://prettier.io/
[ESLint]: https://eslint.org/
[nano-staged]: https://github.com/usmanyunusov/nano-staged
[simple-git-hooks]: https://github.com/toplenboren/simple-git-hooks
[fastify]: https://www.fastify.io/

## Structure

- `directory/`   - the app directory implementation, built with fastify
- `packages/main` - the main Electron application, has access to Node
- `packages/preload` - preload scripts for web renderers.  Bridges the frontend ui to the main process through events and apis
    - `packages/preload/channelPicker` - preload for the channel picker UI
    - `packages/preload/homeView` - preload for the default home view UI. Note: this exposes an additional API on top of the standard FDC3 one - which can only be accessed by native "system" views.
    - `packages/preload/intentResolver` - preload for the intent resolver UI
    - `packages/preload/searchResults` - preload for the searchResults UI
    - `packages/preload/view` - preload for all content views.  This is where the FDC3 API is implemented.
    - `packages/preload/index.ts` - preload for the main window - i.e. the frame around all view content.
- `packages/renderer` - the parts of the desktop agent UI built with [React], isolated from main app, and shown in a window on the desktop
    - `packages/renderer/channelPicker` - UI for the channel picker
    - `packages/renderer/homeView` - UI for the default home view
    - `packages/renderer/intentResolver` - UI for the intent resolver window
    - `packages/renderer/searchResults` - UI for the searchResults window
    - `packages/preload/src` - UI for the main window - i.e. the frame around all view content.  This covers the search bar, channel picker button, and tabs.

## App Directory Setup

Modify the local directory entries here:

- `directory/src/data`

The local appD will run at `localhost:8080` by default.

By default, the Desktop Agent points to the local directory in development and to the `https://appd.kolbito.com` directory in production.  You can change the local settings in `scripts/watch.js` by modifying the entries for `VITE_DEV_DIRECTORY_URL` and change the production setting by modifying the value for `productionDirectory` in `packages/main/src/utils.ts`.

## Getting Started

Install dependencies:

~~~
npm install
~~~

Build and run the app directory:

~~~
npm run build:directory
npm run start:directory
~~~

This will run a local App Directory on port 8080.

Start the FDC3 application:

~~~
npm start
~~~

Other useful commands:

1. `npm start` / `npm run watch` - Start the Electron app in dev mode.
1. `npm run compile` - Build the app for local debugging only.
1. `npm run lint` - Lint the code.
1. `npm run typecheck` - Run a TypeScript check.
1. `npm run test` - Run tests for all parts of the application, including end-to-end tests.

## Mailing List

To join the Electron FDC3 Desktop Agent & App Directory mailing list please email [electron-fdc3+subscribe@lists.finos.org](mailto:electron-fdc3+subscribe@lists.finos.org).


## Contributing

1. Fork it (<https://github.com/finos/electron-fdc3/fork>)
2. Create your feature branch (`git checkout -b feature/fooBar`)
3. Read our [contribution guidelines](.github/CONTRIBUTING.md) and [Community Code of Conduct](https://www.finos.org/code-of-conduct)
4. Commit your changes (`git commit -am 'Add some fooBar'`)
5. Push to the branch (`git push origin feature/fooBar`)
6. Create a new Pull Request

_NOTE:_ Commits and pull requests to FINOS repositories will only be accepted from those contributors with an active, executed Individual Contributor License Agreement (ICLA) with FINOS OR who are covered under an existing and active Corporate Contribution License Agreement (CCLA) executed with FINOS. Commits from individuals not covered under an ICLA or CCLA will be flagged and blocked by the FINOS Clabot tool (or [EasyCLA](https://github.com/finos/community/blob/master/governance/Software-Projects/EasyCLA.md)). Please note that some CCLAs require individuals/employees to be explicitly named on the CCLA.

*Need an ICLA? Unsure if you are covered under an existing CCLA? Email [help@finos.org](mailto:help@finos.org)*


## License

Copyright 2022 Nick Kolba

Distributed under the [Apache License, Version 2.0](http://www.apache.org/licenses/LICENSE-2.0).

SPDX-License-Identifier: [Apache-2.0](https://spdx.org/licenses/Apache-2.0)
