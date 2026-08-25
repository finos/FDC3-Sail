---
sidebar_position: 1
---

# @finos/sail-theme

`@finos/sail-theme` is Sail's shared brand design layer: framework-agnostic CSS custom properties, a
Tailwind v4 glue file, logo assets, and a bundled webfont. It exists so the brand — colours, shadows,
gradients, typography — has exactly one source of truth instead of being copy-pasted into every shell
and the docs site.

**Location:** `packages/sail-theme/`

## What it is

The package ships no application code — `package.json` declares no build step and no `src/`. It is a
set of static files exposed through subpath exports (`package.json:7-12`):

| Export | File | For |
|---|---|---|
| `@finos/sail-theme/tokens.css` | `tokens.css` | Framework-agnostic CSS custom properties (`--sail-primary`, `--sail-ocean`, `--sail-font-family`, shadows, gradients, …). The only import a **non-Tailwind** consumer needs. |
| `@finos/sail-theme/tailwind.css` | `tailwind.css` | Tailwind v4 `@theme inline` glue (`--color-sail-*`, `--font-family-sail`, …) plus brand utility classes (`.font-sail`). It `@import`s `tokens.css` itself (`tailwind.css:2`), so a Tailwind consumer needs only this one file. |
| `@finos/sail-theme/assets/*` | `assets/logo/*` | Sail/FDC3 logo marks (SVG and PNG variants). |
| `@finos/sail-theme/fonts/*` | `fonts/DM_Sans/*` | The bundled DM Sans webfont plus its own `DM_Sans.css` `@font-face` rules. |

`tailwind.css:1`'s own comment states the split directly: *"Tailwind v4 glue for Sail shells.
Non-Tailwind consumers (docs site) should import `./tokens.css` instead."*

## Why it needs to be a separate package

The two example shells are not allowed to import each other — see
[Architecture Overview — Enforced boundaries](../../architecture/overview#enforced-boundaries) for the
enforced rule. Brand values that both shells (and the docs site) need cannot legally live inside either
shell, so a shared, UI-free package is the only place they can go without violating that boundary or
duplicating the brand in three places.

## How to use it

**Non-Tailwind consumer** (plain CSS, e.g. the docs site):

```css
@import "@finos/sail-theme/tokens.css";
```

Then reference the custom properties directly: `color: var(--sail-ocean);`.

**Tailwind v4 consumer** (a shell using shadcn/ui on Tailwind):

```css
@import "@finos/sail-theme/tailwind.css";
```

This pulls in `tokens.css` automatically and adds the `@theme inline` mappings
(`--color-sail-primary`, `--color-sail-secondary`, `--color-sail-ocean`, `--color-sail-wave`,
`--font-family-sail`, `--font-family-sail-mono`, `--box-shadow-sail*`) plus utility classes
(`.font-sail`, `.font-sail-mono`), so Tailwind class names like `text-sail-primary` or `font-sail`
resolve to the same brand values.

**Assets and fonts** — import by path, e.g. an `<img src="@finos/sail-theme/assets/logo/logo.svg">` or
a webfont `@import "@finos/sail-theme/fonts/DM_Sans/DM_Sans.css"`.

## Reference implementations

- **`website`** (this docs site) imports `@finos/sail-theme/tokens.css` in
  `website/src/css/custom.css`, whose own comment (`:6`) calls `@finos/sail-theme` "the single source of
  truth" for brand colours and (`:8`) points contributors at `packages/sail-theme/tokens.css` to change
  them.
- **`sail-finance`** depends on the package and imports its `tailwind.css` (relative path, from
  `src/shadcn-theme.css`) to feed its Tailwind-based shadcn/ui components.
- **`sail-one`** does not currently import this package — its `src/styles/tokens.css` defines its own,
  separate token set (a cyan/ink palette derived from the logo mark, distinct property names such as
  `--sail-cyan`/`--sail-ink`). This is a fact about that shell today, not a limitation of
  `@finos/sail-theme`'s API.

## Related

- [Architecture Overview](../../architecture/overview) — package ownership and enforced import
  boundaries.
- [@finos/sail-finance](../sail-finance/overview) · [@finos/sail-one](../sail-one/overview) — the two
  example shells.
