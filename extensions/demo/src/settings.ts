export const DEMO_SETTINGS_KEY = "settings"

export type DemoSettings = {
  enabled: boolean
  label: string
}

export const DEMO_DEFAULT_SETTINGS: DemoSettings = {
  enabled: true,
  label: "demo",
}
