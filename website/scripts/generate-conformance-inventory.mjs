#!/usr/bin/env node
/**
 * Generates the Cucumber BDD inventory section of
 * `website/docs/packages/headless-agent/bdd.md` from the feature files under
 * `packages/sail-headless-agent/test/features/{v2,v3}/`.
 *
 * This is the engine / DACP messaging suite — not the FINOS FDC3 conformance
 * toolbox (that lives under `packages/conformance-harness` and runs against
 * product hosts: sail-one, sail-finance, sail-v2-web).
 *
 * Versioning model: FDC3 2.2 vs 3.0 suites live in separate directories
 * (`test/features/v2/` and `test/features/v3/`). Cucumber runs both trees via
 * the default profile in `packages/sail-headless-agent/cucumber.yml`.
 *
 * Usage:
 *   node website/scripts/generate-conformance-inventory.mjs          # regenerate
 *   node website/scripts/generate-conformance-inventory.mjs --check  # exit 1 if stale
 *
 * Also invoked as `prebuild` / `prestart` for `@finos/sail-docs`.
 *
 * Scope note: this parses Gherkin well enough for this repo's feature files —
 * plain `Scenario:` blocks with optional feature-level and/or scenario-level
 * `@tag` lines. It deliberately does NOT support `Scenario Outline:` /
 * `Examples:` tables (none exist in this suite today); it throws loudly if one
 * appears so the counting logic gets updated deliberately instead of silently
 * under-counting.
 */

import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs"
import { join, relative, dirname } from "node:path"
import { fileURLToPath } from "node:url"

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = join(SCRIPT_DIR, "..", "..")
const AGENT_PKG = "packages/sail-headless-agent"
const FEATURES_DIR = join(REPO_ROOT, AGENT_PKG, "test/features")
const BDD_DOC = join(REPO_ROOT, "website/docs/packages/headless-agent/bdd.md")

const START_MARKER = "{/* GENERATED:BDD-INVENTORY:START */}"
const END_MARKER = "{/* GENERATED:BDD-INVENTORY:END */}"

const VERSIONS = [
  { id: "v2", label: "FDC3 2.2", dirName: "v2" },
  { id: "v3", label: "FDC3 3.0", dirName: "v3" },
]

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
  const relPath = relative(join(REPO_ROOT, AGENT_PKG), absPath).replace(/\\/g, "/")
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

    if (line.startsWith("Feature:")) {
      featureTags = pendingTags
      pendingTags = []
      continue
    }

    if (/^Scenario Outline:/.test(line)) {
      throw new Error(
        `${relPath}: Scenario Outline is not supported by the BDD inventory script. ` +
          `Update generate-conformance-inventory.mjs before adding outlines.`,
      )
    }

    if (line.startsWith("Scenario:")) {
      const name = line.slice("Scenario:".length).trim()
      scenarios.push({ name, tags: [...pendingTags] })
      pendingTags = []
      continue
    }

    if (line === "" || line.startsWith("#")) {
      continue
    }

    // Non-tag, non-scenario content clears pending tags that weren't attached
    // (Gherkin attaches tags to the next Feature/Scenario only).
    if (
      !line.startsWith("Given") &&
      !line.startsWith("When") &&
      !line.startsWith("Then") &&
      !line.startsWith("And") &&
      !line.startsWith("But") &&
      !line.startsWith("|") &&
      !line.startsWith("Background:") &&
      !line.startsWith("Rule:")
    ) {
      // keep pendingTags — they may belong to a following Scenario
    }
  }

  return { relPath, featureTags: featureTags ?? [], scenarios }
}

function buildInventory() {
  const byVersion = []
  let totalFiles = 0
  let totalScenarios = 0

  for (const ver of VERSIONS) {
    const dir = join(FEATURES_DIR, ver.dirName)
    const files = findFeatureFiles(dir)
    const perFile = files.map(parseFeatureFile).map(f => ({
      relPath: f.relPath,
      total: f.scenarios.length,
    }))
    const verTotal = perFile.reduce((n, f) => n + f.total, 0)
    byVersion.push({
      ...ver,
      perFile,
      totalFiles: perFile.length,
      totalScenarios: verTotal,
    })
    totalFiles += perFile.length
    totalScenarios += verTotal
  }

  return { byVersion, totalFiles, totalScenarios }
}

function mdTable(rows, headers) {
  const headerRow = `| ${headers.join(" | ")} |`
  const sepRow = `| ${headers.map(() => "---").join(" | ")} |`
  const bodyRows = rows.map(r => `| ${r.join(" | ")} |`)
  return [headerRow, sepRow, ...bodyRows].join("\n")
}

function renderSection(inv) {
  const lines = []
  lines.push(
    `_This section is generated from \`${AGENT_PKG}/test/features/\` — do not ` +
      "hand-edit between the markers. Regenerated by docs `prebuild` / `prestart`, or " +
      "`npm run conformance:inventory --workspace=@finos/sail-docs` " +
      "(`website/scripts/generate-conformance-inventory.mjs`)._",
  )
  lines.push("")
  lines.push(
    `**${inv.totalFiles} feature files** / **${inv.totalScenarios} scenarios** under ` +
      `\`test/features/\` today, split by FDC3 wire version into ` +
      inv.byVersion
        .map(
          v => `**${v.totalFiles}** \`${v.dirName}/\` (${v.label}, ${v.totalScenarios} scenarios)`,
        )
        .join(" and ") +
      ".",
  )

  for (const ver of inv.byVersion) {
    lines.push("")
    lines.push(`#### \`${ver.dirName}/\` — ${ver.label}`)
    lines.push("")
    const rows = ver.perFile.map(f => [`\`${f.relPath}\``, String(f.total)])
    lines.push(mdTable(rows, ["Feature file", "Scenarios"]))
    lines.push("")
    lines.push(`**Total: ${ver.totalScenarios} scenarios across ${ver.totalFiles} files.**`)
  }

  lines.push("")
  lines.push(`#### Run (\`${AGENT_PKG}/cucumber.yml\`)`)
  lines.push("")
  lines.push("```bash")
  lines.push(`cd ${AGENT_PKG}`)
  lines.push(
    `npm test   # default profile: v2 + v3, ${inv.totalScenarios} scenarios (excludes @failing)`,
  )
  lines.push("```")

  return lines.join("\n")
}

function main() {
  const checkOnly = process.argv.includes("--check")
  const inv = buildInventory()
  const section = renderSection(inv)

  const doc = readFileSync(BDD_DOC, "utf8")
  const startIdx = doc.indexOf(START_MARKER)
  const endIdx = doc.indexOf(END_MARKER)
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    throw new Error(
      `Could not find ${START_MARKER} / ${END_MARKER} markers in ${BDD_DOC}. ` +
        "Add them around the generated inventory section before running this script.",
    )
  }

  const before = doc.slice(0, startIdx + START_MARKER.length)
  const after = doc.slice(endIdx)
  const newDoc = `${before}\n\n${section}\n\n${after}`

  if (checkOnly) {
    if (newDoc === doc) {
      console.log("headless-agent/bdd.md generated section is up to date.")
      process.exit(0)
    } else {
      console.error(
        "headless-agent/bdd.md generated section is STALE. Run " +
          "`npm run conformance:inventory --workspace=@finos/sail-docs` and commit the result.",
      )
      process.exit(1)
    }
  } else {
    writeFileSync(BDD_DOC, newDoc, "utf8")
    console.log(`Wrote generated inventory section to ${relative(REPO_ROOT, BDD_DOC)}`)
    for (const ver of inv.byVersion) {
      console.log(
        `  ${ver.dirName}/ (${ver.label}): ${ver.totalScenarios} scenarios / ${ver.totalFiles} files`,
      )
    }
  }
}

main()
