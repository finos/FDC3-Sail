import { io, Socket } from "socket.io-client"
import { link } from "./util";
import { AppHosting, APP_HELLO, AppHelloArgs } from "@finos/fdc3-sail-common";
import { BrowserTypes } from "@finos/fdc3";
import { isWebConnectionProtocol1Hello } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes";

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

function getInstanceId(): string {
    const source = getQueryVariable("instanceId")
    return source
}

function getAppId(): string {
    const source = getQueryVariable("appId")
    return source
}

function doSocketConnection(socket: Socket, channel: MessageChannel, instanceId: string, appId: string, messageData: BrowserTypes.WebConnectionProtocol1Hello) {
    socket.on("connect", async () => {

        try {
            link(socket, channel, instanceId)
            const sessionId = getUserSessionId()

            const response = await socket.emitWithAck(APP_HELLO, {
                userSessionId: sessionId,
                instanceId,
                appId
            } as AppHelloArgs)

            console.log("SAIL Received: " + JSON.stringify(response));

            const intentResolverUrl = response == AppHosting.Tab ? window.location.origin + "/static/ui/intent-resolver.html" : undefined
            const channelSelectorUrl = response == AppHosting.Tab ? window.location.origin + "/static/ui/channel-selector.html" : undefined

            // send the other end of the channel to the app
            appWindow.postMessage({
                type: 'WCP3Handshake',
                meta: {
                    connectionAttemptUuid: messageData.meta.connectionAttemptUuid,
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
}

const helloListener = (e: MessageEvent) => {
    const messageData = e.data;
    const eventSource = e.source;

    let eventSourceName;
    try {
        eventSourceName = (eventSource as Window)?.name;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e: unknown) {
        eventSourceName = `{a cross-origin window} `;
    }
    if (!eventSourceName) {
        eventSourceName = '{no window name set} ';
    }

    if (isWebConnectionProtocol1Hello(messageData)) {
        console.debug(
            'Communication iframe adaptor received hello message from: ',
            eventSourceName,
            eventSource == appWindow ? '(parent window): ' : '(NOT parent win): ',
            messageData
        );

        window.removeEventListener('message', helloListener);

        const socket = io();
        const channel = new MessageChannel();
        const instanceId = getInstanceId()
        const appId = getAppId()

        doSocketConnection(socket, channel, instanceId, appId, messageData)
    }
};

window.addEventListener('message', helloListener);
