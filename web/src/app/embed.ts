import { io } from "socket.io-client"
import { link } from "./util";
import { APP_HELLO, AppHelloArgs } from "../server/da/message-types";
import { AppHosting } from "../server/da/SailServerContext";
import { BrowserTypes } from "@finos/fdc3";

const appWindow = window.parent;

function getQueryVariable(variable: string): string {
    var query = window.location.search.substring(1);
    var vars = query.split("&");
    for (var i = 0; i < vars.length; i++) {
        var pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }

    return ""

}

function getUserSessionId(): string {
    const uuid = getQueryVariable("desktopAgentId")
    return uuid
}

function getConnectionAttemptUuid(): string {
    const uuid = getQueryVariable("connectionAttemptUuid")
    return uuid
}

function getInstanceId(): string {
    const source = getQueryVariable("instanceId")
    return source
}

function getAppId(): string {
    const source = getQueryVariable("appId")
    return source
}

window.addEventListener("load", () => {

    const socket = io()
    const channel = new MessageChannel()
    const instanceId = getInstanceId()
    const appId = getAppId()

    socket.on("connect", async () => {

        try {
            link(socket, channel, instanceId)
            const sessionId = getUserSessionId()

            const response = await socket.emitWithAck(APP_HELLO, {
                userSessionId: sessionId,
                instanceId,
                appId
            } as AppHelloArgs)

            console.log("Received: " + JSON.stringify(response));

            const intentResolverUrl = response == AppHosting.Tab ? window.location.origin + "/static/ui/intent-resolver.html" : undefined
            const channelSelectorUrl = response == AppHosting.Tab ? window.location.origin + "/static/ui/channel-selector.html" : undefined

            // send the other end of the channel to the app
            appWindow.postMessage({
                type: 'WCP3Handshake',
                meta: {
                    connectionAttemptUuid: getConnectionAttemptUuid(),
                    timestamp: new Date()
                },
                payload: {
                    fdc3Version: "2.2",
                    intentResolverUrl,
                    channelSelectorUrl,
                }
            } as BrowserTypes.WebConnectionProtocol3Handshake, "*", [channel.port1])

        } catch (e) {
            console.error("Error in handshake", e)
        }
    })
})
