import { describe, expect, it } from "vite-plus/test"
import type { DirectoryApp } from "@finos/sail-desktop-agent"

import {
  CONFORMANCE_HOSTED_ORIGIN,
  CONFORMANCE_LOCAL_ORIGIN,
  loadConformanceApplications,
  rewriteConformanceAppDirectoryOrigin,
} from "./conformance-app-directory"

describe("loadConformanceApplications", () => {
  it("returns hosted FINOS URLs and FDC3 3.0 by default", () => {
    const loaded = loadConformanceApplications({ profile: "hosted" })

    expect(loaded.profile).toBe("hosted")
    expect(loaded.fdc3Version).toBe("3.0")
    expect(loaded.origin).toBe(CONFORMANCE_HOSTED_ORIGIN)

    const conformance1 = loaded.applications.find(app => app.appId === "Conformance1")
    expect(conformance1?.details).toMatchObject({
      url: `${CONFORMANCE_HOSTED_ORIGIN}/apps/app/index.html`,
    })
  })

  it("rewrites hosted URLs to localhost:3001 and targets FDC3 2.2 for local profile", () => {
    const loaded = loadConformanceApplications({ profile: "local" })

    expect(loaded.profile).toBe("local")
    expect(loaded.fdc3Version).toBe("2.2")
    expect(loaded.origin).toBe(CONFORMANCE_LOCAL_ORIGIN)

    const conformance1 = loaded.applications.find(app => app.appId === "Conformance1")
    expect(conformance1?.details).toMatchObject({
      url: `${CONFORMANCE_LOCAL_ORIGIN}/apps/app/index.html`,
    })

    const mockApp = loaded.applications.find(app => app.appId === "MockAppId")
    expect(mockApp?.details).toMatchObject({
      url: `${CONFORMANCE_LOCAL_ORIGIN}/apps/general/index.html`,
    })
  })

  it("accepts a custom localOrigin for same-origin hosts (e.g. sail-web :3000)", () => {
    const sailWebOrigin = "http://localhost:3000"
    const loaded = loadConformanceApplications({
      profile: "local",
      localOrigin: sailWebOrigin,
    })

    expect(loaded.origin).toBe(sailWebOrigin)
    const conformance1 = loaded.applications.find(app => app.appId === "Conformance1")
    expect(conformance1?.details).toMatchObject({
      url: `${sailWebOrigin}/apps/app/index.html`,
    })
  })

  it("preserves paths after the toolbox base when rewriting", () => {
    const apps: DirectoryApp[] = [
      {
        appId: "IntentAppAId",
        title: "Intent App A",
        type: "web",
        details: {
          url: `${CONFORMANCE_HOSTED_ORIGIN}/apps/intent-a/index.html`,
        },
        icons: [{ src: `${CONFORMANCE_HOSTED_ORIGIN}/finos-icon-256.png` }],
      },
    ]

    const rewritten = rewriteConformanceAppDirectoryOrigin(
      apps,
      CONFORMANCE_HOSTED_ORIGIN,
      CONFORMANCE_LOCAL_ORIGIN,
    )

    expect(rewritten[0]!.details).toMatchObject({
      url: `${CONFORMANCE_LOCAL_ORIGIN}/apps/intent-a/index.html`,
    })
    expect(rewritten[0]!.icons?.[0]?.src).toBe(`${CONFORMANCE_LOCAL_ORIGIN}/finos-icon-256.png`)
  })

  it("does not mutate the fixture when loading hosted profile", () => {
    const first = loadConformanceApplications({ profile: "hosted" })
    first.applications[0]!.title = "mutated"

    const second = loadConformanceApplications({ profile: "hosted" })
    expect(second.applications[0]!.title).not.toBe("mutated")
  })
})
