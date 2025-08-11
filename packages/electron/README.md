# FDC3-Sail Electron Package

This package contains the Electron application wrapper for FDC3-Sail, providing a desktop application experience with native window controls.

## Features

- Custom window with titlebar separation
- Native OS controls (minimize, maximize, close)
- DevTools integration with keyboard shortcuts
- Auto-reconnection to local development server

## Installation

The Electron package is part of the FDC3-Sail monorepo. To install dependencies:

```bash
# From the project root
npm install

# Or specifically for electron package
cd packages/electron
npm install
```

## Development

```bash
# Start the development server
npm run dev
```

## Keyboard Shortcuts

The application includes several keyboard shortcuts:

- `Ctrl+Shift+I` - Open DevTools for the main content area
- `Ctrl+Shift+T` - Open DevTools for the titlebar
- `Ctrl+Shift+R` - Reload the current page

## Configuration

The application can be configured with environment variables:

- `SAIL_URL` - The URL of the SAIL web application (default: http://localhost:8090)

## Building

```bash
# Build the Electron application
npm run build
```

## Architecture

The application consists of:

- A main process (`main.ts`)
- A custom titlebar (`titlebar.html`)
- Preload scripts for secure context bridging
- Content loading from the SAIL web application

## License

See the project root for license information.
