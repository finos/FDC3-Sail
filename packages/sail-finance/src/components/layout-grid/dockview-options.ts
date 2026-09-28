/** Keep iframe panels mounted when hidden — prevents WCP disconnect on tab switch. */
export const FDC3_PANEL_RENDERER = "always" as const

export function isFdc3PanelParams(params: unknown): boolean {
  return Boolean((params as { panel?: { panelId: string } } | undefined)?.panel?.panelId)
}

export function extractFdc3PanelId(params: unknown): string | undefined {
  return (params as { panel?: { panelId: string } } | undefined)?.panel?.panelId
}
