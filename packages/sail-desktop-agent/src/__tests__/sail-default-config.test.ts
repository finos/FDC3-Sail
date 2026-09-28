import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import { SailDesktopAgent } from "../agent/sail-desktop-agent"
import {
  DEFAULT_SAIL_DESKTOP_AGENT_METADATA,
  resolveDesktopAgentConfig,
} from "../agent/default-config"

const { version: packageVersion } = JSON.parse(
  readFileSync(new URL("../../package.json", import.meta.url), "utf-8"),
) as { version: string }

describe("DEFAULT_SAIL_IMPLEMENTATION_METADATA", () => {
  it("uses the published package version as providerVersion", () => {
    expect(DEFAULT_SAIL_DESKTOP_AGENT_METADATA.providerVersion).toBe(packageVersion)
  })
})

describe("resolveDesktopAgentConfig", () => {
  it("applies FDC3-Sail product defaults when overrides omit implementationMetadata", () => {
    const config = resolveDesktopAgentConfig({})

    expect(config.desktopAgentMetadata).toEqual(DEFAULT_SAIL_DESKTOP_AGENT_METADATA)
    expect(config.desktopAgentMetadata.provider).toBe("FDC3-Sail")
    expect(config.heartbeatIntervalMs).toBe(30_000)
    expect(config.heartbeatTimeoutMs).toBe(60_000)
    expect(config.heartbeatEnabled).toBe(true)
    expect(config.channelChangeTimeoutMs).toBe(10_000)
  })

  it("does not let explicit undefined heartbeat options clobber product defaults", () => {
    const config = resolveDesktopAgentConfig({
      heartbeatEnabled: undefined,
      heartbeatIntervalMs: undefined,
      heartbeatTimeoutMs: undefined,
      channelChangeTimeoutMs: undefined,
    })

    expect(config.heartbeatEnabled).toBe(true)
    expect(config.heartbeatIntervalMs).toBe(30_000)
    expect(config.heartbeatTimeoutMs).toBe(60_000)
    expect(config.channelChangeTimeoutMs).toBe(10_000)
  })

  it("allows disabling heartbeat at the Desktop Agent level", () => {
    const config = resolveDesktopAgentConfig({
      heartbeatEnabled: false,
    })

    expect(config.heartbeatEnabled).toBe(false)
  })

  it("does not let explicit undefined heartbeat timing clobber defaults", () => {
    const config = resolveDesktopAgentConfig({
      heartbeatIntervalMs: undefined,
      heartbeatTimeoutMs: undefined,
    })

    expect(config.heartbeatIntervalMs).toBe(30_000)
    expect(config.heartbeatTimeoutMs).toBe(60_000)
  })

  it("deep-merges partial implementationMetadata overrides", () => {
    const config = resolveDesktopAgentConfig({
      implementationMetadata: {
        provider: "cucumber-provider",
        providerVersion: "1.0.0",
      },
    })

    expect(config.desktopAgentMetadata.provider).toBe("cucumber-provider")
    expect(config.desktopAgentMetadata.providerVersion).toBe("1.0.0")
    expect(config.desktopAgentMetadata.fdc3Version).toBe("2.2")
    expect(config.desktopAgentMetadata.optionalFeatures).toEqual(
      DEFAULT_SAIL_DESKTOP_AGENT_METADATA.optionalFeatures,
    )
  })
})

describe("SailDesktopAgent constructor defaults", () => {
  it("applies Sail defaults when constructed without browser connection", () => {
    const agent = new SailDesktopAgent()
    expect(agent.getImplementationMetadata()).toEqual(DEFAULT_SAIL_DESKTOP_AGENT_METADATA)
  })

  it("deep-merges partial implementationMetadata from constructor options", () => {
    const agent = new SailDesktopAgent({
      implementationMetadata: { provider: "Acme" },
    })
    const metadata = agent.getImplementationMetadata()
    expect(metadata.provider).toBe("Acme")
    expect(metadata.providerVersion).toBe(DEFAULT_SAIL_DESKTOP_AGENT_METADATA.providerVersion)
    expect(metadata.optionalFeatures).toEqual(DEFAULT_SAIL_DESKTOP_AGENT_METADATA.optionalFeatures)
  })
})
