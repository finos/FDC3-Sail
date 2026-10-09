import { createProgrammaticIntentResolver, type IntentResolver } from "@finos/sail-browser-agent"

/**
 * Build a host {@link IntentResolver} that picks handlers programmatically
 * (no modal UI) — used by the minimal harness host and by product shells under
 * `VITE_AUTO_RESOLVE=1`.
 */
export function createHarnessIntentResolver(debug = false): IntentResolver {
  return createProgrammaticIntentResolver({
    debug,
    log: (message, detail) => {
      if (detail !== undefined && detail !== "") {
        console.log(message.replace("[ProgrammaticIntentResolver]", "[ConformanceHarness]"), detail)
      } else {
        console.log(message.replace("[ProgrammaticIntentResolver]", "[ConformanceHarness]"))
      }
    },
  })
}
