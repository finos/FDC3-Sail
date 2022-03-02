# Vite Electron React Sample App

This is an Electron React sample built with [Vite].

It has been modified from the [Vite Electron Builder Boilerplate] (also see [TEMPLATE.md](./TEMPLATE.md)). 

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
[React Testing Library]: https://testing-library.com/docs/react-testing-library/intro/
[Typescript]: https://github.com/microsoft/TypeScript/
[Playwright]: https://playwright.dev
[Prettier]: https://prettier.io/
[ESLint]: https://eslint.org/
[nano-staged]: https://github.com/usmanyunusov/nano-staged
[simple-git-hooks]: https://github.com/toplenboren/simple-git-hooks

## Structure

- `packages/main` - the main Electron application, has access to Node
- `packages/preload` - preload script for web renderer, can expose APIs to web app
- `packages/renderer` - normal web application built with [React], isolated from main app, and shown in a window on the desktop

## Commands

1. `npm start` / `npm run watch` - Start the Electron app in dev mode.
1. `npm run compile` - Build the app for local debugging only.
1. `npm run lint` - Lint the code.
1. `npm run typecheck` - Run a TypeScript check.
1. `npm run test` - Run tests for all parts of the application, including end-to-end tests.
