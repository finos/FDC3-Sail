import expect from "expect"

export function handleResolve(val: string | undefined, world: any): any {
  if (val === undefined || val === null) return val
  if (val === "undefined") return undefined
  if (val === "null") return null
  if (world?.props && typeof val === "string" && val in world.props) {
    return world.props[val]
  }
  return val
}

export function setupGenericSteps(): void {
  // Hook for generic cucumber steps
}

export function matchData(world: any, actualData: any[], dt: any): void {
  if (!dt) return
  const rows = typeof dt.hashes === "function" ? dt.hashes() : dt
  if (!Array.isArray(rows)) return

  expect(actualData.length).toBeGreaterThanOrEqual(rows.length)

  rows.forEach((row: Record<string, any>, index: number) => {
    const actual = actualData[index]
    if (!actual) return

    Object.keys(row).forEach((key) => {
      const expectedVal = handleResolve(row[key], world)
      if (typeof actual === "object" && actual !== null) {
        const actualVal = key.includes(".")
          ? key.split(".").reduce((o, i) => o?.[i], actual)
          : actual[key]
        if (actualVal !== undefined) {
          expect(String(actualVal)).toEqual(String(expectedVal))
        }
      }
    })
  })
}
