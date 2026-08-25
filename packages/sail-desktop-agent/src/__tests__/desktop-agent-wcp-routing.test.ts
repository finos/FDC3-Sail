import { describe, it, expect } from "vite-plus/test"
import type { BrowserTypes } from "@finos/fdc3"
import { createDesktopAgentWithTestConnection } from "../../test/support/desktop-agent-test-harness"

describe("DesktopAgent WCP routing", () => {
  function createAgentWithApps(
    apps: Array<{
      appId: string
      title: string
      type: "web"
      details: { url: string }
    }>,
  ) {
    return createDesktopAgentWithTestConnection({ apps })
  }

  it("routes WCP4 without meta.source and uses temp instanceId", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "test-app",
        title: "Test App",
        type: "web",
        details: {
          url: "https://example.com/app",
        },
      },
    ])

    const message = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: "test-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(message, { messageOrigin: "https://example.com" })

    expect(connection.sentMessages).toHaveLength(1)
    const response = connection.sentMessages.at(-1) as {
      type: string
      meta?: {
        destination?: { instanceId?: string }
        connectionAttemptUuid?: string
        timestamp?: string
      }
    }

    expect(response.type).toBe("WCP5ValidateAppIdentityResponse")
    expect(response.meta?.destination?.instanceId).toBe("temp-test-uuid")
    expect(response.meta?.connectionAttemptUuid).toBe("test-uuid")
    expect(typeof response.meta?.timestamp).toBe("string")
  })

  it("rejects WCP4 when MessageEvent.origin does not match identityUrl origin", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "test-app",
        title: "Test App",
        type: "web",
        details: {
          url: "https://example.com/app",
        },
      },
    ])

    const message = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: "test-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(message, { messageOrigin: "https://malicious.example.com" })

    expect(connection.sentMessages).toHaveLength(1)
    const response = connection.sentMessages.at(-1) as {
      type: string
      payload?: { message?: string }
    }

    expect(response.type).toBe("WCP5ValidateAppIdentityFailedResponse")
    expect(response.payload?.message).toContain("Origin mismatch")
  })

  it("issues a new instance identity instead of failing when reconnect instance is unknown", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "test-app",
        title: "Test App",
        type: "web",
        details: {
          url: "https://example.com/app",
        },
      },
    ])

    const message = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
        instanceId: "missing-instance-id",
        instanceUuid: "missing-instance-uuid",
      },
      meta: {
        connectionAttemptUuid: "unknown-reconnect-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(message, { messageOrigin: "https://example.com" })

    const response = connection.sentMessages.at(-1) as {
      type: string
      payload?: { appId?: string; instanceId?: string; instanceUuid?: string }
    }

    expect(response.type).toBe("WCP5ValidateAppIdentityResponse")
    expect(response.payload?.appId).toBe("test-app")
    expect(response.payload?.instanceId).not.toBe("missing-instance-id")
    expect(response.payload?.instanceUuid).not.toBe("missing-instance-uuid")
  })

  it("does not match app identity via actualUrl when identityUrl does not match app directory", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "test-app",
        title: "Test App",
        type: "web",
        details: {
          url: "https://example.com/app",
        },
      },
    ])

    const message = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/not-in-app-directory",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: "identity-url-priority-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(message, { messageOrigin: "https://example.com" })

    const response = connection.sentMessages.at(-1) as {
      type: string
      payload?: { message?: string }
    }
    expect(response.type).toBe("WCP5ValidateAppIdentityFailedResponse")
    expect(response.payload?.message).toContain("App not found in app directory")
  })

  it("supports component-based identityUrl matching against app directory URL", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "test-app",
        title: "Test App",
        type: "web",
        details: {
          url: "https://example.com/app",
        },
      },
    ])

    const message = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app?tab=positions#main",
        actualUrl: "https://example.com/app?tab=positions#main",
      },
      meta: {
        connectionAttemptUuid: "component-match-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(message, { messageOrigin: "https://example.com" })

    const response = connection.sentMessages.at(-1) as {
      type: string
      payload?: { appId?: string }
    }
    expect(response.type).toBe("WCP5ValidateAppIdentityResponse")
    expect(response.payload?.appId).toBe("test-app")
  })

  it("does not reuse instance identity when appId differs from existing instance", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "app-a",
        title: "App A",
        type: "web",
        details: {
          url: "https://example.com/app-a",
        },
      },
      {
        appId: "app-b",
        title: "App B",
        type: "web",
        details: {
          url: "https://example.com/app-b",
        },
      },
    ])

    const firstMessage = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app-a",
        actualUrl: "https://example.com/app-a",
      },
      meta: {
        connectionAttemptUuid: "app-a-connect-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(firstMessage, { messageOrigin: "https://example.com" })

    const firstResponse = connection.sentMessages.at(-1) as {
      type: string
      payload?: { instanceId?: string; instanceUuid?: string }
    }
    expect(firstResponse.type).toBe("WCP5ValidateAppIdentityResponse")
    const existingInstanceId = firstResponse.payload?.instanceId
    const existingInstanceUuid = firstResponse.payload?.instanceUuid
    expect(existingInstanceId).toBeDefined()
    expect(existingInstanceUuid).toBeDefined()

    const reconnectWithDifferentAppMessage = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app-b",
        actualUrl: "https://example.com/app-b",
        instanceId: existingInstanceId,
        instanceUuid: existingInstanceUuid,
      },
      meta: {
        connectionAttemptUuid: "app-b-reconnect-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(reconnectWithDifferentAppMessage, {
      messageOrigin: "https://example.com",
    })

    const secondResponse = connection.sentMessages.at(-1) as {
      type: string
      payload?: { appId?: string; instanceId?: string; instanceUuid?: string }
    }
    expect(secondResponse.type).toBe("WCP5ValidateAppIdentityResponse")
    expect(secondResponse.payload?.appId).toBe("app-b")
    expect(secondResponse.payload?.instanceId).not.toBe(existingInstanceId)
    expect(secondResponse.payload?.instanceUuid).not.toBe(existingInstanceUuid)
  })

  it("does not reuse instance identity when instanceUuid mismatches existing record", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "test-app",
        title: "Test App",
        type: "web",
        details: {
          url: "https://example.com/app",
        },
      },
    ])

    const firstMessage = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: "initial-connect-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(firstMessage, { messageOrigin: "https://example.com" })

    const firstResponse = connection.sentMessages.at(-1) as {
      type: string
      payload?: { instanceId?: string }
    }
    expect(firstResponse.type).toBe("WCP5ValidateAppIdentityResponse")
    const existingInstanceId = firstResponse.payload?.instanceId
    expect(existingInstanceId).toBeDefined()

    const badReconnectMessage = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
        instanceId: existingInstanceId,
        instanceUuid: "mismatched-instance-uuid",
      },
      meta: {
        connectionAttemptUuid: "bad-reconnect-uuid",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(badReconnectMessage, { messageOrigin: "https://example.com" })

    const secondResponse = connection.sentMessages.at(-1) as {
      type: string
      payload?: { instanceId?: string; instanceUuid?: string }
    }
    expect(secondResponse.type).toBe("WCP5ValidateAppIdentityResponse")
    expect(secondResponse.payload?.instanceId).not.toBe(existingInstanceId)
    expect(secondResponse.payload?.instanceUuid).not.toBe("mismatched-instance-uuid")
  })

  it("generates distinct values for instanceId and instanceUuid for new instances", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "test-app",
        title: "Test App",
        type: "web",
        details: {
          url: "https://example.com/app",
        },
      },
    ])

    const message = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: "distinct-id-uuid-connect",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(message, { messageOrigin: "https://example.com" })

    const response = connection.sentMessages.at(-1) as {
      type: string
      payload?: { instanceId?: string; instanceUuid?: string }
    }
    expect(response.type).toBe("WCP5ValidateAppIdentityResponse")
    expect(response.payload?.instanceId).toBeTruthy()
    expect(response.payload?.instanceUuid).toBeTruthy()
    expect(response.payload?.instanceUuid).not.toBe(response.payload?.instanceId)
  })

  it("reuses instance identity only when reconnecting from the same source window", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "test-app",
        title: "Test App",
        type: "web",
        details: {
          url: "https://example.com/app",
        },
      },
    ])

    const sourceWindowRef = { label: "window-a" }

    const firstMessage = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: "same-window-initial",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(firstMessage, {
      sourceWindow: sourceWindowRef,
      messageOrigin: "https://example.com",
    })

    const firstResponse = connection.sentMessages.at(-1) as {
      type: string
      payload?: { instanceId?: string; instanceUuid?: string }
    }

    expect(firstResponse.type).toBe("WCP5ValidateAppIdentityResponse")
    const firstInstanceId = firstResponse.payload?.instanceId
    const firstInstanceUuid = firstResponse.payload?.instanceUuid
    expect(firstInstanceId).toBeDefined()
    expect(firstInstanceUuid).toBeDefined()

    const reconnectMessage = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
        instanceId: firstInstanceId,
        instanceUuid: firstInstanceUuid,
      },
      meta: {
        connectionAttemptUuid: "same-window-reconnect",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(reconnectMessage, {
      sourceWindow: sourceWindowRef,
      messageOrigin: "https://example.com",
    })

    const secondResponse = connection.sentMessages.at(-1) as {
      type: string
      payload?: { instanceId?: string; instanceUuid?: string }
    }
    expect(secondResponse.type).toBe("WCP5ValidateAppIdentityResponse")
    expect(secondResponse.payload?.instanceId).toBe(firstInstanceId)
    expect(secondResponse.payload?.instanceUuid).toBe(firstInstanceUuid)
  })

  it("issues a new identity when reconnect request comes from a different source window", async () => {
    const { connection } = createAgentWithApps([
      {
        appId: "test-app",
        title: "Test App",
        type: "web",
        details: {
          url: "https://example.com/app",
        },
      },
    ])

    const firstWindowRef = { label: "window-a" }
    const secondWindowRef = { label: "window-b" }

    const firstMessage = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
      },
      meta: {
        connectionAttemptUuid: "window-mismatch-initial",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(firstMessage, {
      sourceWindow: firstWindowRef,
      messageOrigin: "https://example.com",
    })

    const firstResponse = connection.sentMessages.at(-1) as {
      type: string
      payload?: { instanceId?: string; instanceUuid?: string }
    }

    expect(firstResponse.type).toBe("WCP5ValidateAppIdentityResponse")
    const firstInstanceId = firstResponse.payload?.instanceId
    const firstInstanceUuid = firstResponse.payload?.instanceUuid

    const reconnectMessage = {
      type: "WCP4ValidateAppIdentity",
      payload: {
        identityUrl: "https://example.com/app",
        actualUrl: "https://example.com/app",
        instanceId: firstInstanceId,
        instanceUuid: firstInstanceUuid,
      },
      meta: {
        connectionAttemptUuid: "window-mismatch-reconnect",
        timestamp: new Date().toISOString(),
      },
    } as unknown as BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

    await connection.receiveMessage(reconnectMessage, {
      sourceWindow: secondWindowRef,
      messageOrigin: "https://example.com",
    })

    const secondResponse = connection.sentMessages.at(-1) as {
      type: string
      payload?: { instanceId?: string; instanceUuid?: string }
    }
    expect(secondResponse.type).toBe("WCP5ValidateAppIdentityResponse")
    expect(secondResponse.payload?.instanceId).not.toBe(firstInstanceId)
    expect(secondResponse.payload?.instanceUuid).not.toBe(firstInstanceUuid)
  })
})
