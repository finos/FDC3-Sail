/** Keep iframe panels mounted when hidden — keeps the iframe (and its window) alive on tab switch. */
export const APP_PANEL_RENDERER = "always" as const

export function isAppPanelParams(params: unknown): boolean {
  return Boolean((params as { panel?: { panelId: string } } | undefined)?.panel?.panelId)
}

export function extractAppPanelId(params: unknown): string | undefined {
  return (params as { panel?: { panelId: string } } | undefined)?.panel?.panelId
}
