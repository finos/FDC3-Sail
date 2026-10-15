# Website

Documentation site for FDC3 Sail, built with [Docusaurus](https://docusaurus.io/).

**Production:** [https://fdc3-sail.finos.org](https://fdc3-sail.finos.org) (Netlify)

## Local development

From the monorepo root (preferred):

```bash
npm run docs:dev
```

Or from this directory:

```bash
npm install   # from repo root once
npm start
```

Opens at **http://localhost:3000/** (`baseUrl` is `/`).

## Build

```bash
npm run docs:build   # from repo root
# or: npm run build  # from this directory (runs inventory prebuild)
```

Static output is in `build/`.
