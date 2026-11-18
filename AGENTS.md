# AGENTS.md

Rules for AI coding agents working in this repo. The human who opens a PR owns it and must be able to explain every change.

## Commands

Run from the repo root only (npm workspaces):

- `npm ci` — install dependencies
- `npm run validate` — full CI gate; run before opening a PR
- `npm run lint:fix` / `npm run format:fix` / `npm run typecheck` — fix lint/format issues and check types (these wrap `vp`, oxlint/oxfmt — do not reach for `npx eslint` or `npx prettier`)

## ✅ Always

- Run `npm run validate` before opening a PR.
- Install dependencies from the repo root only, never inside a package.
- Use commit format `type(scope): summary (#issue)`, e.g. `docs: add AGENTS.md with repo rules for AI coding agents (#490)`.

## ⚠️ Ask first

- Before adding a dependency — use built-in APIs first (see Dependency management in the development guide).
- Before changing anything outside the issue's scope.

## 🚫 Never

- Use `--no-verify`, disable lint rules, or skip or delete tests to get green.
- Add changesets — maintainers publish via Changesets; contributors do not add them.
- Open public issues or PRs about vulnerabilities — follow SECURITY.md instead.

## Links

- [Development guide](website/docs/development.md) — setup, commands, quality gates
- [CONTRIBUTING.md](CONTRIBUTING.md) — contribution process and governance
- [SECURITY.md](SECURITY.md) — reporting vulnerabilities
