import type { DirectoryApp } from "@finos/sail-headless-agent"

export const CUSTOM_APPS_SETTINGS_KEY = "customApps"

export type CustomAppsSettings = {
  apps: DirectoryApp[]
}

export const CUSTOM_APPS_DEFAULT_SETTINGS: CustomAppsSettings = {
  apps: [],
}
