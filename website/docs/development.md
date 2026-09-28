---
sidebar_position: 4
---

# Development Guide

This guide is for **contributors** who clone the FDC3-Sail monorepo and work on Sail packages, tests, and documentation.

If you want to **run the Sail platform** without contributing, see [Run Sail](./run-sail). If you want to **embed a Desktop Agent in your own web app**, see [Getting Started](./getting-started).

For the contribution process, CLA requirements, and project governance (maintainer roles and voting), see [CONTRIBUTING.md](https://github.com/finos/FDC3-Sail/blob/main/CONTRIBUTING.md) in the repository — this guide covers only the technical side: environment setup, commands, and code quality gates.

## Prerequisites

- Node.js **24+**
- npm **11+**

```bash
nvm use 24
```

## Clone and install

```bash
git clone https://github.com/finos/FDC3-Sail.git
cd FDC3-Sail
npm install
```

Always install from the **repository root**. Shared dev tooling (TypeScript, Vite, Vitest, ESLint, Prettier, and React type packages) lives in the root `package.json` and is hoisted for all workspaces. Workspace packages only declare package-specific dev dependencies (for example Cucumber in `@finos/sail-desktop-agent` or Playwright in `@finos/sail-finance`). Run workspace scripts with `npm run <script> -w <workspace>` from the root — do not `cd` into a package and run `npm install` there.

### Run the full stack locally

```bash
npm run dev
```

Starts Desktop Agent (watch), platform API (watch), and Sail web UI on **http://localhost:3000**.

```bash
npm run dev:conformance   # FDC3 toolbox clean room on :3001
npm run docs:dev          # Documentation site (use --port 3002 if web app is running)
```

## Project Structure

FDC3 Sail is an npm workspace monorepo:

```
FDC3-Sail/
├── packages/          
│   ├── sail-desktop-agent/  # Pure FDC3 2.2 Desktop Agent (@finos/sail-desktop-agent)
│   ├── sail-platform/  # Platform composition layer & transports (@finos/sail-platform)
│   ├── sail-theme/     # Brand tokens + assets, framework-agnostic (@finos/sail-theme)
│   ├── sail-finance/   # Browser-based finance-specific shell (@finos/sail-finance)
│   ├── sail-one/       # Browser-based domain-neutral shell (@finos/sail-one)
│   └── sail-conformance-harness/  # FDC3 toolbox clean room (@finos/sail-conformance-harness)
└── website/            # Documentation (Docusaurus)
```

## Internal and Development Packages

The main package docs focus on packages adopters are likely to use directly. These package docs are most useful when working inside the monorepo:

- [@finos/sail-conformance-harness](./packages/conformance-harness/overview) - clean-room FDC3 toolbox host for conformance debugging.

## Common Commands

### Development

```bash
# Start browser-based development (most common) — sail-finance shell
npm run dev

# Same, but with the sail-one shell instead of sail-finance
npm run dev:one

# FDC3 conformance toolbox host
npm run dev:conformance

# Start documentation site
npm run docs:dev
```

### Code Quality

```bash
# Run all quality checks (recommended before commits)
npm run validate

# Type checking
npm run typecheck

# Linting
npm run lint
npm run lint:fix

# Formatting
npm run format
npm run format:fix
```

### Testing

```bash
# Unit tests (Vitest) - watch mode
npm run test

# Run tests once
npm test -- --run

# Desktop Agent tests (Vitest + Cucumber)
npm test -w @finos/sail-desktop-agent

# FDC3 Desktop Agent BDD (Cucumber)
npm run test:cucumber -w @finos/sail-desktop-agent
```

### Building

```bash
# Build publishable / CI workspaces
npm run build

# Documentation site
npm run docs:build

# Build specific workspace
npm run build --workspace=@finos/sail-platform

# Clean build artifacts
npm run clean
```

## Code Submission Process

### Before You Start

1. **Check for existing issues** - Search GitHub issues for related work
2. **Create an issue** - Describe your proposed changes and get feedback
3. **Fork the repository** - Create your own copy to work in

### Making Changes

#### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

#### 2. Development Standards

**Code Quality Requirements:**

Run `npm run validate` before commits. It runs the same gate as CI: format, build, lint (including package-boundary import rules), typecheck, docs conformance inventory, docs build, Vitest (`npm test -- --run`), and Cucumber (`npm run test:cucumber -w @finos/sail-desktop-agent`).

Individual steps when iterating:

- `npm run lint` / `npm run lint:fix`
- `npm run typecheck`
- `npm run format` / `npm run format:fix`
- `npm run build` (CI workspaces)
- `npm run docs:build`

#### 3. Quality Check Before Submission

```bash
# Run this before every commit (full CI gate)
npm run validate

# If a step fails, fix and re-run validate:
npm run lint:fix      # Lint
npm run format:fix    # Format
# Fix type errors manually, then:
npm run validate
```

### Commit Message Format

```bash
type: brief description

- More detailed explanation if needed
- Use bullet points for multiple changes
- Reference issue numbers: Fixes #123
```

**Common types:**
- `feat:` - New features
- `fix:` - Bug fixes
- `docs:` - Documentation changes
- `refactor:` - Code restructuring
- `test:` - Adding or updating tests
- `chore:` - Maintenance tasks

## Key Technologies

- **TypeScript** - Type-safe JavaScript
- **React 19** - UI framework
- **Zustand** - State management
- **Dockview** - Workspace layout management
- **Tailwind CSS** - Styling
- **Vite** - Build tool
- **Vitest** - Testing framework
- **Cucumber** - BDD testing for FDC3 compliance

## Publishing packages (maintainers)

Publishable npm packages (not yet published — see the root [README status](https://github.com/finos/FDC3-Sail#status)): `@finos/sail-desktop-agent` and `@finos/sail-platform`. Other workspaces are private and are not versioned or published.

Releases use [Changesets](https://github.com/changesets/changesets). Contributors do not need to add changesets; maintainers batch weekly (or per merge) on `main`.

### Weekly release ritual

1. Review merged PRs since the last release.
2. On `main`, add one or more changeset files (CLI or hand-written markdown):

   ```bash
   npm run changeset
   ```

   Example `.changeset/wcp-heartbeat-fix.md`:

   ```md
   ---
   "@finos/sail-desktop-agent": patch
   ---

   Fix heartbeat cleanup for canonical WCP5 instance ids (#123, #124).
   ```

3. Commit and push the `.changeset/` file(s) to `main`.
4. The **Release** GitHub Action opens or updates a **Version Packages** pull request (version bumps + `CHANGELOG.md` updates).
5. Merge the Version Packages PR. CI builds, publishes to npm, pushes git tags, and opens GitHub Releases.

Packages can ship independently and stay on different semver lines. Desktop Agent is in Changesets **pre** mode (`3.0.0-pre.x`); run `npx changeset pre exit` before the first stable `3.0.0` release.

### Prerequisites

- Repository secret `NPM_TOKEN` with publish access to the `@finos` scope on npm.
- Workflow: `.github/workflows/release.yml` (targets branch `main`).

## Recommended VS Code Extensions

- ESLint
- Prettier
- TypeScript and JavaScript Language Features
