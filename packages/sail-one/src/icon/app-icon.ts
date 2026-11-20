import type { SailApp } from "@finos/sail-platform"

export const DEFAULT_ICON = "/icons/control/choose-app.svg"

export function getIcon(a: SailApp | undefined): string {
  return a?.icon || DEFAULT_ICON
}
