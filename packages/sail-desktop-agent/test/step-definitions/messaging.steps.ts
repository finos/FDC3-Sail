import { DataTable, Then } from "@cucumber/cucumber"
import { CustomWorld } from "../world/index.ts"
import expect from "expect"
import { handleResolve, matchDataSubset, matchDataUnordered } from "../support/testing-utils"

interface AppIntentRecord {
  intent?: {
    name?: string
  }
  apps?: Array<{ appId?: string; instanceId?: string | null }>
}

Then("messaging will have outgoing posts", function (this: CustomWorld, dt: DataTable) {
  // Get messages from mock transport
  const allMessages = this.mockTransport.getPostedMessages()

  // Just take the last few posts and match those
  const matching = dt.rows().length
  let toUse = allMessages
  if (toUse.length > matching) {
    toUse = toUse.slice(toUse.length - matching, toUse.length)
  }

  matchDataUnordered(this, toUse, dt)
})

Then("messaging will include outgoing posts", function (this: CustomWorld, dt: DataTable) {
  const allMessages = this.mockTransport.getPostedMessages()
  const matchSubset = matchDataSubset
  matchSubset(this, allMessages, dt)
})

Then("messaging will have {int} posts", function (this: CustomWorld, count: number) {
  const messages = this.mockTransport.getPostedMessages()
  expect(messages.length).toEqual(count)
})

Then(
  "messaging will have {int} posts matching type {string}",
  function (this: CustomWorld, count: number, messageType: string) {
    const messages = this.mockTransport
      .getPostedMessages()
      .filter(record => record.msg.type === messageType)
    expect(messages.length).toEqual(count)
  },
)

Then(
  "{string} response intent {string} includes app {string} with instanceId {string}",
  function (
    this: CustomWorld,
    responseType: string,
    intentName: string,
    appId: string,
    instanceId: string,
  ) {
    const resolvedIntentName = handleResolve(intentName, this) as string
    const resolvedAppId = handleResolve(appId, this) as string
    const resolvedInstanceId = handleResolve(instanceId, this)

    const message = [...this.mockTransport.getPostedMessages()]
      .reverse()
      .map(record => record.msg)
      .find(record => record.type === responseType)

    if (!message) {
      throw new Error(`No message found with type ${responseType}`)
    }

    const appIntents: AppIntentRecord[] =
      responseType === "raiseIntentForContextResponse" ||
      responseType === "findIntentsByContextResponse"
        ? ((message.payload?.appIntents ?? []) as AppIntentRecord[])
        : ([message.payload?.appIntent].filter(Boolean) as AppIntentRecord[])

    const intentMatch = appIntents.find(appIntent => appIntent.intent?.name === resolvedIntentName)

    if (!intentMatch) {
      throw new Error(`No appIntent found for intent ${resolvedIntentName}`)
    }

    const apps = (intentMatch.apps ?? []) as Array<{ appId?: string; instanceId?: string | null }>

    const matchesInstanceId = (actualInstanceId?: string | null) => {
      if (resolvedInstanceId === null) {
        return actualInstanceId === null || actualInstanceId === undefined
      }
      return actualInstanceId === resolvedInstanceId
    }

    const hasMatch = apps.some(
      appEntry => appEntry.appId === resolvedAppId && matchesInstanceId(appEntry.instanceId),
    )

    if (!hasMatch) {
      throw new Error(
        `No app entry found for appId ${resolvedAppId} with instanceId ${resolvedInstanceId}`,
      )
    }
  },
)

Then(
  "{string} response intent {string} does not include app {string} with instanceId {string}",
  function (
    this: CustomWorld,
    responseType: string,
    intentName: string,
    appId: string,
    instanceId: string,
  ) {
    const resolvedIntentName = handleResolve(intentName, this) as string
    const resolvedAppId = handleResolve(appId, this) as string
    const resolvedInstanceId = handleResolve(instanceId, this)

    const message = [...this.mockTransport.getPostedMessages()]
      .reverse()
      .map(record => record.msg)
      .find(record => record.type === responseType)

    if (!message) {
      throw new Error(`No message found with type ${responseType}`)
    }

    const appIntents: AppIntentRecord[] =
      responseType === "raiseIntentForContextResponse" ||
      responseType === "findIntentsByContextResponse"
        ? ((message.payload?.appIntents ?? []) as AppIntentRecord[])
        : ([message.payload?.appIntent].filter(Boolean) as AppIntentRecord[])

    const intentMatch = appIntents.find(appIntent => appIntent.intent?.name === resolvedIntentName)

    if (!intentMatch) {
      throw new Error(`No appIntent found for intent ${resolvedIntentName}`)
    }

    const apps = (intentMatch.apps ?? []) as Array<{ appId?: string; instanceId?: string | null }>

    const matchesInstanceId = (actualInstanceId?: string | null) => {
      if (resolvedInstanceId === null) {
        return actualInstanceId === null || actualInstanceId === undefined
      }
      return actualInstanceId === resolvedInstanceId
    }

    const hasMatch = apps.some(
      appEntry => appEntry.appId === resolvedAppId && matchesInstanceId(appEntry.instanceId),
    )

    if (hasMatch) {
      throw new Error(
        `Unexpected app entry found for appId ${resolvedAppId} with instanceId ${resolvedInstanceId}`,
      )
    }
  },
)
