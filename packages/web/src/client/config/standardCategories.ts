/**
 * Standard FDC3 App Directory categories as defined by the FDC3 specification
 * Reference: https://fdc3.finos.org/docs/app-directory/overview#app-metadata
 */
export const STANDARD_FDC3_CATEGORIES = [
  "allocations",
  "analytics",
  "charts",
  "chat",
  "communication",
  "compliance",
  "crm",
  "developer tools",
  "events",
  "execution management",
  "file sharing",
  "market data",
  "news",
  "networking",
  "office apps",
  "order management",
  "portfolio management",
  "presentation",
  "pricing",
  "productivity",
  "research",
  "risk",
  "screen sharing",
  "security",
  "spreadsheet",
  "trade cost analysis",
  "trading system",
  "training",
  "travel",
  "video",
  "visualization",
  "weather",
  "other",
] as const

export type StandardFDC3Category = (typeof STANDARD_FDC3_CATEGORIES)[number]
