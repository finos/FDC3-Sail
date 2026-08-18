import { Given, Then, When } from "@cucumber/cucumber"
import expect from "expect"

import { getInstance } from "../../src/state/selectors"
import { CustomWorld } from "../world/index.ts"
import { createMeta, getAppInstanceId } from "./generic.steps"
import { ensureAppInstanceForTesting } from "./start-app.steps"

When("{string} requests close [fdc3.close]", async function (this: CustomWorld, appStr: string) {
  await ensureAppInstanceForTesting(this, appStr)
  this.mockTransport.allMessages = []

  const from = createMeta(this, appStr)
  await this.mockTransport.receiveMessage({
    type: "closeRequest",
    meta: from,
    payload: {},
  })
})

Given("{string} is configured to fail on close", function (this: CustomWorld, appStr: string) {
  const instanceId = getAppInstanceId(this, appStr)
  this.mockAppLauncher.setInstanceToFailOnClose(instanceId)
})

Then("messaging will have no closeResponse", function (this: CustomWorld) {
  const closeResponses = this.mockTransport.getMessagesByType("closeResponse")
  expect(closeResponses).toHaveLength(0)
})

Then("{string} was closed via AppLauncher", function (this: CustomWorld, appStr: string) {
  const instanceId = getAppInstanceId(this, appStr)
  expect(this.mockAppLauncher.getCloseHistory()).toContain(instanceId)
})

Then("{string} instance is removed from agent state", function (this: CustomWorld, appStr: string) {
  const instanceId = getAppInstanceId(this, appStr)
  expect(getInstance(this.getState(), instanceId)).toBeUndefined()
})

Then(
  "{string} instance is registered in agent state",
  function (this: CustomWorld, appStr: string) {
    const instanceId = getAppInstanceId(this, appStr)
    expect(getInstance(this.getState(), instanceId)).toBeDefined()
  },
)
