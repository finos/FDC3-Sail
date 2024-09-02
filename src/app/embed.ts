import { io } from "socket.io-client"
import { link } from "./util";
import { APP_HELLO } from "../server/da/message-types";
import { getClientState } from "../client/state/client";

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
    const clientState = getClientState()
    const appId = getAppId()

    socket.on("connect", () => {

        link(socket, channel, instanceId)

        socket.emit(APP_HELLO, clientState.getUserSessionID(), instanceId, appId)

        // sned the other end of the channel to the app
        appWindow.postMessage({
            type: 'WCP3Handshake',
            meta: {
                connectionAttemptUuid: getConnectionAttemptUuid(),
                timestamp: new Date()
            },
            payload: {
                fdc3Version: "2.2",
                resolver: false, //window.location.origin + "/static/da/intent-resolver.html",
                channelSelector: false //window.location.origin + "/static/da/channel-selector.html",
            }
        }, "*", [channel.port1])


    })
})
