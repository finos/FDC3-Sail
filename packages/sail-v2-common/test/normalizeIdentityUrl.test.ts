import * as fc from "fast-check"
import { describe, expect, it } from "vitest"
import {
  normalizeIdentityUrl,
  normalizeUrlPathname,
  urlsReferToSameApp,
} from "../src/normalizeIdentityUrl"

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

describe("urlsReferToSameApp", () => {
  it("treats index.html as equivalent to the directory path", () => {
    expect(
      urlsReferToSameApp(
        "https://fdc3.finos.org/toolbox/3.0/fdc3-conformance/apps/app/index.html",
        "https://fdc3.finos.org/toolbox/3.0/fdc3-conformance/apps/app/",
      ),
    ).toBe(true)
  })

  it("normalizeUrlPathname strips index.html", () => {
    expect(normalizeUrlPathname("/apps/app/index.html")).toBe("/apps/app")
    expect(normalizeUrlPathname("/apps/app/")).toBe("/apps/app")
  })
})
