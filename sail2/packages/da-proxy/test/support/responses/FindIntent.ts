import { FindIntentAgentRequest, FindIntentAgentResponse, FindIntentAgentResponseMeta } from "@finos/fdc3/dist/bridging/BridgingTypes";
import { AutomaticResponse, IntentDetail, TestMessaging, intentDetailMatches } from "../TestMessaging";

export class FindIntent implements AutomaticResponse {

    filter(t: string) {
        return t == 'findIntentRequest'
    }

    action(input: object, m: TestMessaging) {
        const intentRequest = input as FindIntentAgentRequest
        const payload = intentRequest.payload
        const intent = payload.intent
        const context = payload?.context?.type
        const resultType = payload?.resultType;
        const template: IntentDetail = {
            intent,
            context,
            resultType
        }

        const relevant = m.intentDetails.filter(id => intentDetailMatches(id, template, false))
        const request = this.createFindIntentResponseMessage(intentRequest, relevant)
        setTimeout(() => { m.receive(request) }, 100)
        return Promise.resolve()
    }

    private createFindIntentResponseMessage(m: FindIntentAgentRequest, relevant: IntentDetail[]): FindIntentAgentResponse {
        return {
            meta: m.meta as FindIntentAgentResponseMeta,
            type: "findIntentResponse",
            payload: {
                appIntent: {
                    apps: relevant.map(r => {
                        return {
                            appId: r?.app?.appId!!,
                            instanceId: r?.app?.instanceId
                        }
                    }),
                    intent: {
                        displayName: m.payload.intent,
                        name: m.payload.intent
                    }
                }
            }
        }
    }
}