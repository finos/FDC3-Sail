/** Matches `sail.extension.json` `id`. */
export const DEMO_EXTENSION_ID = "sail.demo"

export const DEMO_SETTINGS_KEY = "settings"

export type DemoSettings = {
  enabled: boolean
  label: string
}

export const DEMO_DEFAULT_SETTINGS: DemoSettings = {
  enabled: true,
  label: "demo",
}
