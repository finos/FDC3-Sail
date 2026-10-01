import { DataTable, Given, Then, When } from "@cucumber/cucumber"
import { CustomWorld } from "../world"
import expect from "expect"
import {
  setupGenericSteps,
  matchData,
  cucumberWrapStep,
  registerFieldMatcher,
  pathForFieldSuffix,
  type PropsWorldLike,
  type RowFieldMatcher,
} from "@finos/cucumber-testing-steps"

const MATCHES_TYPE_SUFFIX = "matches_type"

/**
 * Lightweight matches_type matcher for Sail tests.
 * Full AJV schema validation lives in @finos/fdc3-schema/test (not published);
 * here we only require msg.type to equal the expected schema id.
 */
const matchesTypeMatcher: RowFieldMatcher = {
  matchesField: (field: string) => field.endsWith(MATCHES_TYPE_SUFFIX),
  matchField(
    _world: PropsWorldLike,
    field: string,
    schemaId: string,
    rowData: unknown,
  ) {
    const path = pathForFieldSuffix(field, MATCHES_TYPE_SUFFIX)
    if (path === null) {
      return false
    }
    const value =
      path === ""
        ? rowData
        : path.split(".").reduce<unknown>((acc, key) => {
            if (acc == null || typeof acc !== "object") {
              return undefined
            }
            return (acc as Record<string, unknown>)[key]
          }, rowData)
    if (value == null || typeof value !== "object") {
      return false
    }
    return (value as { type?: string }).type === schemaId
  },
}

registerFieldMatcher(matchesTypeMatcher)

Given("schemas loaded", function (this: CustomWorld) {
  // No-op: published @finos/fdc3-schema does not ship test schema loaders.
  // matches_type is handled by the lightweight matcher above.
})

Then(
  "messaging will have outgoing posts",
  function (this: CustomWorld, dt: DataTable) {
    // just take the last few posts and match those
    const matching = dt.rows().length
    let toUse = this.sc?.postedMessages
    if (toUse.length > matching) {
      toUse = toUse.slice(toUse.length - matching, toUse.length)
    }
    matchData(this, toUse, dt)
  },
)

Then(
  "messaging will have {int} posts",
  function (this: CustomWorld, count: number) {
    expect(this.sc.postedMessages.length).toEqual(count)
  },
)

setupGenericSteps({
  Given,
  When,
  Then,
  wrapStep: cucumberWrapStep,
})
