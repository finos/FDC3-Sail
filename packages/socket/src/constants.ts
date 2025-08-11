/**
 * Application-wide constants for the Socket package
 * Centralized location for all constant values used across the application
 */

/** FDC3 and Provider Configuration */
export const APP_CONFIG = {
  PROVIDER_VERSION: "2.0",
  FDC3_VERSION: "2.0",
  PROVIDER_NAME: "FDC3 Sail",
  DEFAULT_PORT: 8090,
  DEFAULT_ICON: "/icons/control/choose-app.svg",
  CORS_ORIGINS: [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
  ],
} as const

/** Socket Handler Configuration */
export const SOCKET_CONFIG = {
  APP_INSTANCE_PREFIX: "sail-app-",
  DEBUG_RECONNECTION_SUFFIX: " - RECOVERED ",
  POLLING_INTERVAL_MS: parseInt(process.env.POLLING_INTERVAL_MS || "100", 10),
  STATE_REPORT_INTERVAL_MS: parseInt(
    process.env.STATE_REPORT_INTERVAL_MS || "3000",
    10,
  ),
  DEBUG_MODE:
    process.env.DEBUG_MODE === "true" || process.env.NODE_ENV === "development",
} as const

/** Legacy exports for backward compatibility */
export const CONFIG = SOCKET_CONFIG
