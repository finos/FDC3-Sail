#!/usr/bin/env node
/**
 * Guards FDC3 version-tag coverage of the Cucumber suite.
 *
 * Every scenario must carry exactly one scenario-level `@fdc3_X.Y` tag naming the version that
 * introduced its behaviour (see the profile comments in `cucumber.yml`). An untagged scenario is
 * worse than a failing one: it matches no version profile, so it silently never runs in any
 * versioned CI lane while still passing in the default profile.
 *
 * The invariant that catches it: `fdc3-3.0` is the cumulative top profile, so it must select
 * exactly the same scenarios as `default`. Drop a tag and the counts diverge.
 *
 * Both runs are `--dry-run`, so this compiles and matches steps without executing any of them.
 */
import { spawnSync } from "node:child_process"
import { existsSync } from "node:fs"
import { dirname, join, parse } from "node:path"
import { fileURLToPath } from "node:url"

const PACKAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), "..")

/**
 * Finds the `cucumber-js` shim by walking up from the package directory. npm hoists it to the
 * workspace root, so it is not under this package's own `node_modules`. Resolving the module
 * subpath directly does not work — `@cucumber/cucumber` does not export `./bin/cucumber.js`.
 */
function findCucumberBin() {
  let dir = PACKAGE_DIR
  const { root } = parse(dir)
  for (;;) {
    const candidate = join(dir, "node_modules", ".bin", "cucumber-js")
    if (existsSync(candidate)) return candidate
    if (dir === root) break
    dir = dirname(dir)
  }
  throw new Error(
    "Could not find the cucumber-js binary in any node_modules/.bin above " +
      `${PACKAGE_DIR}. Run \`npm ci\` from the repository root.`,
  )
}

const CUCUMBER_BIN = findCucumberBin()

/** The cumulative top profile must select every scenario the default profile does. */
const TOP_PROFILE = "fdc3-3.0"

/** Runs cucumber in dry-run mode and returns the scenario count it reports. */
function countScenarios(profileArgs, label) {
  const result = spawnSync(CUCUMBER_BIN, ["--dry-run", "--format", "summary", ...profileArgs], {
    cwd: PACKAGE_DIR,
    encoding: "utf8",
    shell: process.platform === "win32",
  })

  if (result.error) {
    throw new Error(`Could not run cucumber-js for ${label}: ${result.error.message}`)
  }

  const output = `${result.stdout}${result.stderr}`

  // A dry run reports "N scenarios (N skipped)". A non-zero exit here means the suite could not
  // be loaded at all — a broken step definition, say — which is a real failure, not a tag gap.
  if (result.status !== 0) {
    throw new Error(
      `cucumber-js --dry-run exited ${result.status} for ${label}. ` +
        `This is a suite-loading failure, not a tag-coverage failure.\n${output}`,
    )
  }

  const match = /^(\d+) scenarios?\b/m.exec(output)
  if (!match) {
    throw new Error(`Could not parse a scenario count out of the ${label} dry run.\n${output}`)
  }

  return Number(match[1])
}

const defaultCount = countScenarios([], "default")
const topCount = countScenarios(["--profile", TOP_PROFILE], TOP_PROFILE)

if (defaultCount !== topCount) {
  const missing = defaultCount - topCount
  console.error(
    `FDC3 tag coverage gap: ${TOP_PROFILE} (${topCount}) != default (${defaultCount}).\n` +
      `${missing} scenario(s) carry no @fdc3_X.Y tag, so they run in the default profile but in ` +
      `no versioned one.\n\n` +
      `To find them, diff the two scenario lists:\n` +
      `  npx cucumber-js --dry-run --format usage-json > /tmp/default.json\n` +
      `  npx cucumber-js --dry-run --profile ${TOP_PROFILE} --format usage-json > /tmp/top.json\n\n` +
      `Then tag each one with the FDC3 version that introduced its behaviour.`,
  )
  process.exit(1)
}

console.log(
  `FDC3 tag coverage OK: ${defaultCount} scenarios, all carrying an @fdc3_X.Y tag ` +
    `(${TOP_PROFILE} == default).`,
)
