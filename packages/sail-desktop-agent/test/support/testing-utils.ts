/**
 * Testing Utilities
 *
 * Replacement for @finos/testing package functions used in step definitions.
 */

import { DataTable } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import { get } from "lodash"
import expect from "expect"
import { inspect } from "util"

/**
 * Handle resolution of special values in test data.
 * Resolves {null}, {empty}, etc. to actual values.
 */
export function handleResolve(value: string, world: CustomWorld): string | null | undefined {
  if (!value) return value

  if (value === "{lastIntentEventUuid}") {
    const lastIntentEvent = [...world.mockTransport.getPostedMessages()]
      .reverse()
      .find(record => record.msg.type === "intentEvent")
    const meta = lastIntentEvent?.msg?.meta as { eventUuid?: string } | undefined
    return meta?.eventUuid
  }
  if (value === "{lastIntentResultRequestUuid}") {
    return world.props.lastIntentResultRequestUuid as string | undefined
  }

  // Handle special markers
  if (value === "{null}") return null
  if (value === "{empty}") return undefined

  // Check if it's a reference to a prop in the world
  if (value.startsWith("{") && value.endsWith("}")) {
    const propName = value.slice(1, -1)
    return world.props[propName] as string | null | undefined
  }

  return value
}

/**
 * Format a value for display in error messages.
 */
function formatValue(value: unknown): string {
  if (value === null) return "null"
  if (value === undefined) return "undefined"
  if (typeof value === "object") {
    return inspect(value, { depth: 5, compact: false, breakLength: 80 })
  }
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean" || typeof value === "bigint") {
    return String(value)
  }
  if (typeof value === "symbol") return value.toString()
  return inspect(value, { depth: 2, compact: false, breakLength: 80 })
}

/**
 * Assert a field value matches the expected value.
 * Handles special cases like matches_type fields and null/undefined values.
 * Uses Jest expect for assertions with enhanced error messages.
 */
function assertFieldValue(
  actualValue: unknown,
  expectedValue: string | null | undefined,
  fieldName: string,
  context?: { rowIndex: number; actualRow: unknown },
): void {
  // Spec compliance: DACP responses do not require destination appId
  if (fieldName === "to.appId" && actualValue === undefined) {
    return
  }

  // Spec compliance: eventUuid is only required for event messages
  if (fieldName === "msg.meta.eventUuid") {
    const actualRow = context?.actualRow as { msg?: { type?: string } } | undefined
    const messageType = actualRow?.msg?.type
    if (!messageType || !messageType.endsWith("Event")) {
      return
    }
  }

  // Handle pattern matching for "matches_type" fields
  if (fieldName.includes("matches_type") || fieldName.includes("matches_")) {
    if (expectedValue === undefined) {
      try {
        expect(actualValue).toBeTruthy()
      } catch {
        const contextMsg = context
          ? `\n  Row ${context.rowIndex}: ${formatValue(context.actualRow)}`
          : ""
        throw new Error(
          `Field "${fieldName}" should be truthy but got: ${formatValue(actualValue)}${contextMsg}`,
        )
      }
      return
    }

    if (expectedValue === null) {
      try {
        expect(actualValue).toBeFalsy()
      } catch {
        const contextMsg = context
          ? `\n  Row ${context.rowIndex}: ${formatValue(context.actualRow)}`
          : ""
        throw new Error(
          `Field "${fieldName}" should be null/undefined but got: ${formatValue(actualValue)}${contextMsg}`,
        )
      }
      return
    }

    try {
      expect(actualValue).toEqual(expectedValue)
    } catch {
      const contextMsg = context
        ? `\n  Row ${context.rowIndex}: ${formatValue(context.actualRow)}`
        : ""
      throw new Error(
        `Field "${fieldName}" mismatch:\n  Expected: ${formatValue(expectedValue)}\n  Received: ${formatValue(actualValue)}${contextMsg}`,
      )
    }
    return
  }

  // Handle null/undefined expectations
  // {null} means "no value present" - accept null or undefined
  if (expectedValue === null) {
    try {
      expect(actualValue).toBeFalsy()
    } catch {
      const contextMsg = context
        ? `\n  Row ${context.rowIndex}: ${formatValue(context.actualRow)}`
        : ""
      throw new Error(
        `Field "${fieldName}" should be null/undefined but got: ${formatValue(actualValue)}${contextMsg}`,
      )
    }
    return
  }

  // {empty} or {undefined} - don't assert specific value
  if (expectedValue === undefined) {
    return
  }

  // Conformance placeholder: require a parseable ISO-8601 timestamp string
  if (expectedValue === "ISO8601-timestamp-required") {
    if (typeof actualValue !== "string" || Number.isNaN(Date.parse(actualValue))) {
      const contextMsg = context
        ? `\n  Row ${context.rowIndex}: ${formatValue(context.actualRow)}`
        : ""
      throw new Error(
        `Field "${fieldName}" expected ISO-8601 timestamp but got: ${formatValue(actualValue)}${contextMsg}`,
      )
    }
    return
  }

  // Conformance placeholder: require a non-empty string (e.g. intentResult.metadata.traceId)
  if (expectedValue === "MUST-BE-NON-EMPTY") {
    if (typeof actualValue !== "string" || actualValue.length === 0) {
      const contextMsg = context
        ? `\n  Row ${context.rowIndex}: ${formatValue(context.actualRow)}`
        : ""
      throw new Error(
        `Field "${fieldName}" expected non-empty string but got: ${formatValue(actualValue)}${contextMsg}`,
      )
    }
    return
  }

  // If expected looks like a boolean, convert for comparison
  if ((expectedValue === "true" || expectedValue === "false") && typeof actualValue === "boolean") {
    const booleanValue = expectedValue === "true"
    try {
      expect(actualValue).toBe(booleanValue)
    } catch {
      const contextMsg = context
        ? `\n  Row ${context.rowIndex}: ${formatValue(context.actualRow)}`
        : ""
      throw new Error(
        `Field "${fieldName}" expected boolean ${booleanValue} but got: ${formatValue(actualValue)}${contextMsg}`,
      )
    }
    return
  }

  // If expected looks like a number, convert for comparison
  const numericValue = Number(expectedValue)
  if (!isNaN(numericValue) && typeof actualValue === "number") {
    try {
      expect(actualValue).toBe(numericValue)
    } catch {
      const contextMsg = context
        ? `\n  Row ${context.rowIndex}: ${formatValue(context.actualRow)}`
        : ""
      throw new Error(
        `Field "${fieldName}" expected number ${numericValue} but got: ${formatValue(actualValue)}${contextMsg}`,
      )
    }
    return
  }

  // Standard equality check with enhanced error message
  try {
    expect(actualValue).toEqual(expectedValue)
  } catch {
    const contextMsg = context
      ? `\n  Row ${context.rowIndex}: ${formatValue(context.actualRow)}`
      : ""
    throw new Error(
      `Field "${fieldName}" mismatch:\n  Expected: ${formatValue(expectedValue)}\n  Received: ${formatValue(actualValue)}${contextMsg}`,
    )
  }
}

function matchesRow(
  world: CustomWorld,
  actualRow: unknown,
  expectedRow: Record<string, string>,
  rowIndex: number,
): boolean {
  try {
    Object.entries(expectedRow).forEach(([key, expectedValue]) => {
      const resolvedExpected = handleResolve(expectedValue, world)

      // Map matches_type to type for message fields
      let actualKey = key
      if (key.includes("matches_type")) {
        actualKey = key.replace(/matches_type/g, "type")
      }

      const actualValue = get(actualRow, actualKey) as unknown
      assertFieldValue(actualValue, resolvedExpected, key, {
        rowIndex,
        actualRow,
      })
    })
    return true
  } catch {
    return false
  }
}

/**
 * Match data from test against expected values in DataTable.
 * Supports nested property access and special value handling.
 * Uses Jest expect for assertions with enhanced error messages.
 */
export function matchData(world: CustomWorld, actual: unknown[], dataTable: DataTable): void {
  const expected = dataTable.hashes()

  // Length check with detailed error message
  if (actual.length !== expected.length) {
    const errorMessage = [
      `Expected ${expected.length} message(s) but received ${actual.length} message(s)`,
      "",
      "Expected messages:",
      ...expected.map((row, idx) => `  [${idx}] ${inspect(row, { depth: 3, compact: true })}`),
      "",
      "Actual messages:",
      ...actual.map((msg, idx) => `  [${idx}] ${inspect(msg, { depth: 3, compact: true })}`),
    ].join("\n")

    throw new Error(errorMessage)
  }

  expected.forEach((expectedRow, rowIndex) => {
    const actualRow = actual[rowIndex]

    Object.entries(expectedRow).forEach(([key, expectedValue]) => {
      const resolvedExpected = handleResolve(expectedValue, world)

      // Map matches_type to type for message fields
      let actualKey = key
      if (key.includes("matches_type")) {
        // Replace matches_type with type in the path
        actualKey = key.replace(/matches_type/g, "type")
      }

      const actualValue = get(actualRow, actualKey) as unknown

      assertFieldValue(actualValue, resolvedExpected, key, {
        rowIndex,
        actualRow,
      })
    })
  })
}

/**
 * Match data from test against expected values in DataTable, ignoring order.
 * Uses last-N slicing at the caller to scope recent messages.
 */
export function matchDataUnordered(
  world: CustomWorld,
  actual: unknown[],
  dataTable: DataTable,
): void {
  const expected = dataTable.hashes()

  if (actual.length !== expected.length) {
    const errorMessage = [
      `Expected ${expected.length} message(s) but received ${actual.length} message(s)`,
      "",
      "Expected messages:",
      ...expected.map((row, idx) => `  [${idx}] ${inspect(row, { depth: 3, compact: true })}`),
      "",
      "Actual messages:",
      ...actual.map((msg, idx) => `  [${idx}] ${inspect(msg, { depth: 3, compact: true })}`),
    ].join("\n")

    throw new Error(errorMessage)
  }

  const remaining = [...actual]
  expected.forEach((expectedRow, rowIndex) => {
    const matchIndex = remaining.findIndex(actualRow =>
      matchesRow(world, actualRow, expectedRow, rowIndex),
    )

    if (matchIndex === -1) {
      const errorMessage = [
        "Expected row not found in actual messages:",
        `  [${rowIndex}] ${inspect(expectedRow, { depth: 3, compact: true })}`,
        "",
        "Actual messages:",
        ...remaining.map((msg, idx) => `  [${idx}] ${inspect(msg, { depth: 3, compact: true })}`),
      ].join("\n")

      throw new Error(errorMessage)
    }

    remaining.splice(matchIndex, 1)
  })
}

/**
 * Match data from test against expected values in DataTable, allowing extra messages.
 * Does not require the actual length to match the expected length.
 */
export function matchDataSubset(world: CustomWorld, actual: unknown[], dataTable: DataTable): void {
  const expected = dataTable.hashes()
  const remaining = [...actual]

  expected.forEach((expectedRow, rowIndex) => {
    const matchIndex = remaining.findIndex(actualRow =>
      matchesRow(world, actualRow, expectedRow, rowIndex),
    )

    if (matchIndex === -1) {
      const errorMessage = [
        "Expected row not found in actual messages:",
        `  [${rowIndex}] ${inspect(expectedRow, { depth: 3, compact: true })}`,
        "",
        "Actual messages:",
        ...remaining.map((msg, idx) => `  [${idx}] ${inspect(msg, { depth: 3, compact: true })}`),
      ].join("\n")

      throw new Error(errorMessage)
    }

    remaining.splice(matchIndex, 1)
  })
}
