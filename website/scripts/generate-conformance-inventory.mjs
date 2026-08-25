#!/usr/bin/env node
/**
 * Generates the FDC3 tag inventory section of
 * `website/docs/packages/desktop-agent/conformance.md` from the actual Cucumber
 * feature files under `packages/sail-desktop-agent/test/features/`.
 *
 * Why this exists: the conformance page used to be hand-maintained and drifted
 * badly (wrong file names, wrong scenario counts, whole `@fdc3_3.0` files never
 * mentioned). This script is the source of truth for the *inventory* — which
 * feature files exist, what FDC3-version tags they (and their scenarios) carry,
 * and how many scenarios each combination has. It does not touch the
 * hand-written prose elsewhere on the page.
 *
 * Usage:
 *   node website/scripts/generate-conformance-inventory.mjs          # regenerate the page section
 *   node website/scripts/generate-conformance-inventory.mjs --check  # exit 1 if the page section is stale
 *
 * Scope note: this parses Gherkin well enough for this repo's feature files —
 * plain `Scenario:` blocks with feature-level and/or scenario-level `@tag`
 * lines. It deliberately does NOT support `Scenario Outline:` / `Examples:`
 * tables (none exist in this suite today per a full-tree grep); it throws
 * loudly if one appears so the counting logic gets updated deliberately
 * instead of silently under-counting.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join, relative, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(SCRIPT_DIR, "..", "..")
const FEATURES_DIR = join(REPO_ROOT, "packages/sail-desktop-agent/test/features")
const CUCUMBER_YML = join(REPO_ROOT, "packages/sail-desktop-agent/cucumber.yml")
const CONFORMANCE_DOC = join(REPO_ROOT, "website/docs/packages/desktop-agent/conformance.md")

const START_MARKER = "{/* GENERATED:CONFORMANCE-INVENTORY:START */}"
const END_MARKER = "{/* GENERATED:CONFORMANCE-INVENTORY:END */}"

const FDC3_TAGS = ["@fdc3_2.0", "@fdc3_2.2", "@fdc3_3.0"]

/** Recursively collect .feature files, sorted for stable output. */
function findFeatureFiles(dir) {
  const out = []
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry)
    const st = statSync(full)
    if (st.isDirectory()) {
      out.push(...findFeatureFiles(full))
    } else if (entry.endsWith(".feature")) {
      out.push(full)
    }
  }
  return out.sort()
}

/** Parse one .feature file into { relPath, featureTags, scenarios: [{name, tags}] }. */
function parseFeatureFile(absPath) {
  const relPath = relative(join(REPO_ROOT, "packages/sail-desktop-agent"), absPath).replace(
    /\\/g,
    "/",
  )
  const lines = readFileSync(absPath, "utf8").split(/\r?\n/)

  let pendingTags = []
  let featureTags = null
  const scenarios = []

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (line.startsWith("@")) {
      pendingTags.push(...line.split(/\s+/).filter(Boolean))
      continue
    }

    if (/^Feature:/.test(line)) {
      featureTags = pendingTags
      pendingTags = []
      continue
    }

    if (/^Scenario Outline:/.test(line)) {
      throw new Error(
        `${relPath}: "Scenario Outline:" found. This generator only counts plain ` +
          `"Scenario:" blocks — update the parsing logic before trusting counts ` +
          `that include this file.`,
      )
    }

    if (/^Scenario:/.test(line)) {
      const name = line.replace(/^Scenario:\s*/, "")
      scenarios.push({
        name,
        tags: [...(featureTags ?? []), ...pendingTags],
      })
      pendingTags = []
      continue
    }

    // Any other line (Given/When/Then/table rows/comments/blank) clears a
    // dangling tag block only if it wasn't consumed — Background: has no tags
    // in valid Gherkin, so this is a no-op in practice for this repo's files.
  }

  if (featureTags === null) {
    throw new Error(`${relPath}: no "Feature:" line found — cannot determine feature tags.`)
  }

  return { relPath, featureTags, scenarios }
}

function isActive(scenario) {
  return !scenario.tags.includes("@failing")
}

function countByTag(scenarios, tag) {
  return scenarios.filter(s => isActive(s) && s.tags.includes(tag)).length
}

function buildInventory() {
  const files = findFeatureFiles(FEATURES_DIR).map(parseFeatureFile)

  const perFile = files.map(f => ({
    relPath: f.relPath,
    total: f.scenarios.filter(isActive).length,
    counts: Object.fromEntries(FDC3_TAGS.map(t => [t, countByTag(f.scenarios, t)])),
  }))

  const totals = Object.fromEntries(
    FDC3_TAGS.map(t => [t, perFile.reduce((sum, f) => sum + f.counts[t], 0)]),
  )

  const filesWith22 = perFile.filter(f => f.counts["@fdc3_2.2"] > 0)
  const filesOnly30 = perFile.filter(f => f.counts["@fdc3_3.0"] > 0 && f.counts["@fdc3_2.2"] === 0)
  const filesWith20 = perFile.filter(f => f.counts["@fdc3_2.0"] > 0)

  // Sanity check against cucumber.yml — fail loudly if the profile names this
  // generator assumes have been renamed or removed.
  const cucumberYml = readFileSync(CUCUMBER_YML, "utf8")
  for (const profile of ["fdc3-2.0:", "fdc3-2.2:", "fdc3-3.0:"]) {
    if (!cucumberYml.includes(profile)) {
      throw new Error(
        `cucumber.yml no longer defines a "${profile}" profile — update this generator ` +
          `and the conformance page's run instructions.`,
      )
    }
  }

  return { perFile, totals, filesWith22, filesOnly30, filesWith20, totalFiles: perFile.length }
}

function mdTable(rows, headers) {
  const headerRow = `| ${headers.join(" | ")} |`
  const sepRow = `| ${headers.map(() => "---").join(" | ")} |`
  const bodyRows = rows.map(r => `| ${r.join(" | ")} |`)
  return [headerRow, sepRow, ...bodyRows].join("\n")
}

function renderSection(inv) {
  const rows22 = inv.filesWith22.map(f => [
    `\`${f.relPath}\``,
    String(f.counts["@fdc3_2.2"]),
    f.counts["@fdc3_2.0"] > 0 ? String(f.counts["@fdc3_2.0"]) : "—",
  ])

  const rows30 = inv.filesOnly30.map(f => [`\`${f.relPath}\``, String(f.counts["@fdc3_3.0"])])

  const lines = []
  lines.push(
    "_This section is generated from `packages/sail-desktop-agent/test/features/` — do not " +
      "hand-edit between the markers. Regenerate with " +
      "`npm run conformance:inventory --workspace=@finos/sail-docs` (see " +
      "`website/scripts/generate-conformance-inventory.mjs`)._",
  )
  lines.push("")
  lines.push(
    `**${inv.totalFiles} feature files** under \`test/features/\` today: ` +
      `**${inv.filesWith22.length}** carry \`@fdc3_2.2\` (the 2.2 pack, ${inv.totals["@fdc3_2.2"]} ` +
      `scenarios), and **${inv.filesOnly30.length}** more are \`@fdc3_3.0\`-only ` +
      `(${inv.totals["@fdc3_3.0"] - inv.totals["@fdc3_2.2"]} scenarios) — the 3.0 profile runs both, ` +
      `**${inv.totals["@fdc3_3.0"]}** scenarios total. \`@fdc3_2.0\` is a scenario-level tag inside the ` +
      `2.2 files marking scenarios also valid under FDC3 2.0 (**${inv.totals["@fdc3_2.0"]}** scenarios ` +
      `across **${inv.filesWith20.length}** files).`,
  )
  lines.push("")
  lines.push("#### `@fdc3_2.2` feature files")
  lines.push("")
  lines.push(mdTable(rows22, ["Feature file", "`@fdc3_2.2` scenarios", "of which `@fdc3_2.0`"]))
  lines.push("")
  lines.push(
    `**Total: ${inv.totals["@fdc3_2.2"]} scenarios across ${inv.filesWith22.length} files.**`,
  )
  lines.push("")
  lines.push("#### `@fdc3_3.0`-only feature files (no `@fdc3_2.2` tag)")
  lines.push("")
  lines.push(mdTable(rows30, ["Feature file", "`@fdc3_3.0` scenarios"]))
  lines.push("")
  lines.push(
    `**Total: ${inv.totals["@fdc3_3.0"] - inv.totals["@fdc3_2.2"]} scenarios across ` +
      `${inv.filesOnly30.length} files.**`,
  )
  lines.push("")
  lines.push("#### Run by profile (`packages/sail-desktop-agent/cucumber.yml`)")
  lines.push("")
  lines.push("```bash")
  lines.push("cd packages/sail-desktop-agent")
  lines.push(`npx cucumber-js --profile fdc3-2.2   # ${inv.totals["@fdc3_2.2"]} scenarios`)
  lines.push(`npx cucumber-js --profile fdc3-3.0   # ${inv.totals["@fdc3_3.0"]} scenarios`)
  lines.push(`npx cucumber-js --profile fdc3-2.0   # ${inv.totals["@fdc3_2.0"]} scenarios`)
  lines.push("```")

  return lines.join("\n")
}

function main() {
  const checkOnly = process.argv.includes("--check")
  const inv = buildInventory()
  const section = renderSection(inv)

  const doc = readFileSync(CONFORMANCE_DOC, "utf8")
  const startIdx = doc.indexOf(START_MARKER)
  const endIdx = doc.indexOf(END_MARKER)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      `Could not find ${START_MARKER} / ${END_MARKER} markers in ${CONFORMANCE_DOC}. ` +
        "Add them around the generated inventory section before running this script.",
    )
  }

  const before = doc.slice(0, startIdx + START_MARKER.length)
  const after = doc.slice(endIdx)
  const newDoc = `${before}\n\n${section}\n\n${after}`

  if (checkOnly) {
    if (newDoc === doc) {
      console.log("conformance.md generated section is up to date.")
      process.exit(0)
    } else {
      console.error(
        "conformance.md generated section is STALE. Run " +
          "`npm run conformance:inventory --workspace=@finos/sail-docs` and commit the result.",
      )
      process.exit(1)
    }
  } else {
    writeFileSync(CONFORMANCE_DOC, newDoc, "utf8")
    console.log(`Wrote generated inventory section to ${relative(REPO_ROOT, CONFORMANCE_DOC)}`)
    console.log(
      `  @fdc3_2.2: ${inv.totals["@fdc3_2.2"]} scenarios / ${inv.filesWith22.length} files`,
    )
    console.log(
      `  @fdc3_3.0: ${inv.totals["@fdc3_3.0"]} scenarios / ${inv.totalFiles} files ` +
        `(${inv.totals["@fdc3_3.0"] - inv.totals["@fdc3_2.2"]} scenarios / ${inv.filesOnly30.length} files are 3.0-only)`,
    )
    console.log(
      `  @fdc3_2.0: ${inv.totals["@fdc3_2.0"]} scenarios / ${inv.filesWith20.length} files`,
    )
  }
}

main()
