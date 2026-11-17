import { describe, it, expect } from "vitest"
import {
  validateDescription,
  validateImageFile,
  validateImageUrl,
  validateTag,
  validateIntentName,
  validateContextType,
  hasValidationErrors,
  sanitizeInput,
  generateAppId,
  validateApp,
} from "../validation"

describe("validation extras (Issue #177)", () => {
  it("validates description length", () => {
    expect(validateDescription("").isValid).toBe(true)
    expect(validateDescription("ok").isValid).toBe(true)
    expect(validateDescription("x".repeat(501)).isValid).toBe(false)
  })

  it("validates image files", () => {
    const ok = new File([new Uint8Array([1, 2, 3])], "icon.png", {
      type: "image/png",
    })
    expect(validateImageFile(ok).isValid).toBe(true)

    const tooBig = new File([new Uint8Array(6 * 1024 * 1024)], "big.png", {
      type: "image/png",
    })
    expect(validateImageFile(tooBig).isValid).toBe(false)

    const notImage = new File([new Uint8Array([1])], "notes.txt", {
      type: "text/plain",
    })
    expect(validateImageFile(notImage).isValid).toBe(false)
  })

  it("validates image URLs", () => {
    expect(validateImageUrl("").isValid).toBe(false)
    expect(validateImageUrl("ftp://x/y.png").isValid).toBe(false)
    expect(validateImageUrl("https://example.com/a.png").isValid).toBe(true)
    expect(validateImageUrl("data:image/png;base64,aaa").isValid).toBe(true)
  })

  it("validates tags, intents, and context types", () => {
    expect(validateTag("").isValid).toBe(false)
    expect(validateTag("a").isValid).toBe(false)
    expect(validateTag("market data").isValid).toBe(true)
    expect(validateTag("bad!tag").isValid).toBe(false)

    expect(validateIntentName("").isValid).toBe(false)
    expect(validateIntentName("ViewChart").isValid).toBe(true)
    expect(validateIntentName("bad name").isValid).toBe(false)

    expect(validateContextType("").isValid).toBe(false)
    expect(validateContextType("ab").isValid).toBe(false)
    expect(validateContextType("fdc3.instrument").isValid).toBe(true)
  })

  it("reports whether an error map has entries", () => {
    expect(hasValidationErrors({})).toBe(false)
    expect(hasValidationErrors({ title: "required" })).toBe(true)
  })

  it("sanitizes input and generates unique app ids", () => {
    expect(sanitizeInput("  <script>hi</script>  ")).toBe("scripthi/script")
    expect(generateAppId("Trade Station!", [])).toBe("trade-station")
    expect(generateAppId("Trade Station!", ["trade-station"])).toBe("trade-station-1")
    expect(generateAppId("!!!", ["app"])).toMatch(/^app/)
  })

  it("flags optional field errors on validateApp", () => {
    const errors = validateApp({
      id: "valid-app",
      title: "Valid App",
      type: "web",
      url: "https://example.com",
      publisher: "FINOS",
      version: "1.0.0",
      description: "ok",
      supportEmail: "bad",
      moreInfo: "not-a-url",
    })
    expect(errors.supportEmail).toBeDefined()
    expect(errors.moreInfo).toBeDefined()
  })
})
