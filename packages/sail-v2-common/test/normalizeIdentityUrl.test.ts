import * as fc from "fast-check"
import { describe, expect, it } from "vitest"
import { normalizeIdentityUrl } from "../src/normalizeIdentityUrl"

describe("normalizeIdentityUrl", () => {
  it("is idempotent", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const once = normalizeIdentityUrl(s)
        expect(normalizeIdentityUrl(once)).toBe(once)
      }),
    )
  })

  it("never ends with a slash when non-empty", () => {
    fc.assert(
      fc.property(fc.string(), (s) => {
        const n = normalizeIdentityUrl(s)
        if (n.length > 0) {
          expect(n.endsWith("/")).toBe(false)
        }
      }),
    )
  })

  it("only removes trailing slashes", () => {
    fc.assert(
      fc.property(fc.string(), fc.string(), (a, b) => {
        const joined = `${a}/${b}`
        const n = normalizeIdentityUrl(joined)
        expect(n).toBe(joined.replace(/\/+$/, ""))
      }),
    )
  })
})
