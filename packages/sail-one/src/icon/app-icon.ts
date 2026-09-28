import type { AppMetadata } from "@finos/fdc3"
import type { DirectoryApp } from "@finos/sail-desktop-agent"

export const DEFAULT_ICON = "/icons/control/choose-app.svg"

export function getIcon(a: DirectoryApp | AppMetadata | undefined): string {
  if (a) {
    const icons = a.icons ?? []
    if (icons.length > 0) {
      return icons[0]!.src
    }
  }

  return DEFAULT_ICON
}
