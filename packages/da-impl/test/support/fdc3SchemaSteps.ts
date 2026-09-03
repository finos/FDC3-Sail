import { Given } from "@cucumber/cucumber"
import {
  pathForFieldSuffix,
  registerFieldMatcher,
  valueAtPath,
} from "@finos/cucumber-testing-steps"
import Ajv2019 from "ajv/dist/2019"
import draft7MetaSchema from "ajv/dist/refs/json-schema-draft-07.json"
import addFormats from "ajv-formats"
import fs from "fs"
import path from "path"
import { CustomWorld } from "../world"

/**
 * FDC3-specific test support for the generic steps in
 * `@finos/cucumber-testing-steps`, which is deliberately schema-agnostic.
 *
 * Upstream FDC3 ships the same two pieces from `@finos/fdc3-schema/test`
 * (see finos/FDC3#1890). That subpath is not in the published package yet —
 * `@finos/fdc3-schema@2.2.3` ships `dist` only — so they live here until a
 * release exposes them, at which point this file can be deleted.
 */

const MATCHES_TYPE = "matches_type"
const API_SCHEMA_BASE = "https://fdc3.finos.org/schemas/next/api/"

function findPackageDir(packageName: string): string {
  const candidates = [
    path.resolve(__dirname, "../../node_modules", packageName),
    path.resolve(__dirname, "../../../../node_modules", packageName),
  ]
  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, "package.json"))) {
      return dir
    }
  }
  throw new Error(`Package not found: ${packageName}`)
}

/**
 * Teaches `doesRowMatch` the `matches_type` column: validate the value at that
 * path against the named FDC3 schema rather than comparing it literally.
 */
export function registerFdc3SchemaMatchers() {
  registerFieldMatcher({
    matchesField: (field: string) => field.endsWith(MATCHES_TYPE),
    matchField: (world, field: string, expected: string, rowData: unknown) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const ajv: any = world.props["ajv"]
      if (!ajv) {
        throw new Error(
          `Cannot match '${field}': no schemas loaded. Add a "Given schemas loaded" step.`,
        )
      }

      const validate = ajv.getSchema(
        API_SCHEMA_BASE + expected + ".schema.json",
      )
      if (validate == undefined) {
        throw new Error("No schema found for " + expected)
      }

      const valid = validate(
        valueAtPath(rowData, pathForFieldSuffix(field, MATCHES_TYPE) ?? ""),
      )
      if (!valid) {
        try {
          world.log(
            `Comparing Validation failed: ${JSON.stringify(rowData, null, 2)} \n ${JSON.stringify(validate.errors)}`,
          )
        } catch {
          world.log(
            `Comparing Validation failed: ${JSON.stringify(validate.errors)}`,
          )
        }
      }
      return valid as boolean
    },
  })
}

/** Registers `Given schemas loaded`, which populates the ajv instance above. */
export function setupSchemaSteps() {
  Given("schemas loaded", async function (this: CustomWorld) {
    const ajv = new Ajv2019()
    ajv.addMetaSchema(draft7MetaSchema)
    addFormats(ajv)

    const schemaPkg = findPackageDir("@finos/fdc3-schema")
    const abspath = path.join(schemaPkg, "dist", "schemas", "api")

    try {
      fs.readdirSync(abspath).forEach((file) => {
        if (file.endsWith(".json")) {
          const filePath = path.join(abspath, file)
          const contents = fs.readFileSync(filePath, "utf8")
          const schema = JSON.parse(contents)
          ajv.addSchema(schema)
        }
      })
    } catch (error) {
      console.log(error)
    }

    const contextPkg = findPackageDir("@finos/fdc3-context")
    const contextPath = path.join(
      contextPkg,
      "dist",
      "schemas",
      "context",
      "context.schema.json",
    )
    const contents = fs.readFileSync(contextPath, "utf8")
    const schema = JSON.parse(contents)
    ajv.addSchema(schema)

    this.props["ajv"] = ajv
  })
}
