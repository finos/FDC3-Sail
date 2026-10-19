const STORAGE_KEY = "fdc3-harness-console-capture"

export type HarnessConsoleEntry = {
  level: string
  msg: string
  ts: string
}

declare global {
  interface Window {
    __getHarnessLogs?: () => HarnessConsoleEntry[]
    __clearHarnessLogs?: () => void
    __harnessCaptureInstalled?: boolean
  }
}

function readStoredLogs(): HarnessConsoleEntry[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORAGE_KEY) || "[]") as HarnessConsoleEntry[]
  } catch {
    return []
  }
}

function writeStoredLogs(entries: HarnessConsoleEntry[]): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  } catch {
    // sessionStorage full or unavailable
  }
}

/**
 * Dev-only ring buffer for host-page console output (survives HMR, not full tab close).
 * Enables post-run log collection after FINOS toolbox scenarios.
 */
export function installHarnessConsoleCapture(): void {
  if (typeof window === "undefined" || window.__harnessCaptureInstalled) {
    return
  }

  window.__harnessCaptureInstalled = true
  const logs = readStoredLogs()

  const push = (level: string, args: unknown[]) => {
    const msg = args
      .map(arg => {
        if (typeof arg === "string") {
          return arg
        }
        try {
          return JSON.stringify(arg)
        } catch {
          return String(arg)
        }
      })
      .join(" ")

    logs.push({ level, msg, ts: new Date().toISOString() })
    if (logs.length > 2000) {
      logs.splice(0, logs.length - 2000)
    }
    writeStoredLogs(logs)
  }

  for (const level of ["log", "info", "warn", "error", "debug"] as const) {
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- cross-runtime console
    const original = console[level]?.bind(console)
    // oxlint-disable-next-line typescript/no-unnecessary-condition -- cross-runtime console
    if (!original) {
      continue
    }
    console[level] = (...args: unknown[]) => {
      push(level, args)
      original(...args)
    }
  }

  window.__getHarnessLogs = () => readStoredLogs()
  window.__clearHarnessLogs = () => {
    writeStoredLogs([])
    return readStoredLogs()
  }
}
