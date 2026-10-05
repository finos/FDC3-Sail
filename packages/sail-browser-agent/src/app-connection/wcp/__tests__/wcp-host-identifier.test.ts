import { describe, expect, it } from "vite-plus/test"

import {
  resolveAndPersistConnectionHostIdentifier,
  resolveConnectionHostIdentifier,
  resolveHostIdentifierFromSource,
} from "../wcp-host-identifier"
import type { AppConnectionMetadata } from "../wcp-types"

describe("resolveHostIdentifierFromSource", () => {
  it("falls back to resolveHostIdentifier when window.name is empty", () => {
    const popup = {
      name: "",
    } as Window

    const resolved = resolveHostIdentifierFromSource(popup, {
      resolveHostIdentifier: source => (source === popup ? "launcher-from-registry" : undefined),
    })

    expect(resolved).toBe("launcher-from-registry")
  })

  it("prefers window.name over resolveHostIdentifier", () => {
    const popup = {
      name: "from-window-name",
    } as Window

    const resolved = resolveHostIdentifierFromSource(popup, {
      resolveHostIdentifier: () => "from-registry",
    })

    expect(resolved).toBe("from-window-name")
  })
})

describe("resolveConnectionHostIdentifier", () => {
  it("re-resolves from source when stored hostIdentifier is missing", () => {
    const popup = { name: "" } as Window

    const resolved = resolveConnectionHostIdentifier(
      { source: popup },
      {
        resolveHostIdentifier: () => "launcher-from-registry",
      },
    )

    expect(resolved).toBe("launcher-from-registry")
  })
})

describe("resolveAndPersistConnectionHostIdentifier", () => {
  it("writes re-resolved launcher id onto connection metadata", () => {
    const popup = { name: "" } as Window
    const connection = {
      instanceId: "temp-uuid",
      hostIdentifier: undefined,
      source: popup,
    } as AppConnectionMetadata

    const owner = {
      getConnection: (instanceId: string) => (instanceId === "temp-uuid" ? connection : undefined),
      resolveHostIdentifierForSource: (source: Window) =>
        source === popup ? "launcher-from-registry" : undefined,
    }

    const resolved = resolveAndPersistConnectionHostIdentifier(owner, "temp-uuid")

    expect(resolved).toBe("launcher-from-registry")
    expect(connection.hostIdentifier).toBe("launcher-from-registry")
  })
})
