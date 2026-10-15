# Sail web style guide

Visual language for `@finos/sail-web`, taken from the Sail logo: **cyan**, **ink black**, and **white**.

## Palette

| Token                          | Value     | Use                                        |
| ------------------------------ | --------- | ------------------------------------------ |
| `--sail-cyan`                  | `#50C9EF` | Brand highlight, focus rings, icon accents |
| `--sail-cyan-deep`             | `#0E8BB8` | Primary buttons (white label)              |
| `--sail-ink` / `--sail-topbar` | `#0B1B2B` | Dark navy top bar, primary text            |
| `--sail-white`                 | `#FFFFFF` | Surfaces, text on dark/cyan                |
| `--sail-canvas`                | `#EEF3F7` | App background                             |
| `--sail-border`                | `#D5DEE7` | Dividers, control borders                  |

Do **not** reintroduce the old brown (`#694512`) — it is not on-brand.

## Surfaces

- **Top bar** — dark navy (`--sail-topbar`) with white wordmark; primary CTA uses logo cyan.
- **Channel rail** — cool light (`--sail-rail`).
- **Workspace** — canvas gray; panels on white with a light border.
- **Drawers / modals** — white surface, cyan primary actions.

## Typography

DM Sans. Prefer weight 300 for “FDC3”, 600 for “Sail” and primary actions. Body ~0.9–1rem; muted labels use `--sail-text-muted`.

## Icons

Use [Lucide React](https://lucide.dev/guide/react/) icons (e.g. `Plus`, `Settings`, `X`). Prefer Lucide over hand-rolled SVGs or heavier icon stacks (`@mui/*`, Emotion, `react-icons`).

Chrome icons should inherit `currentColor` via CSS.

## Spacing & radius

Use `--sail-space-*` and `--sail-radius*`. Keep chrome dense; give space to app panels, not chrome padding.

## Tokens source

CSS variables live in `src/styles/tokens.css` and are loaded via `src/styles/global.css`. Prefer `var(--sail-…)` in module CSS instead of raw hex.
