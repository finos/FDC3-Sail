import { InstanceID } from "@finos/fdc3-web-impl"
import { Socket } from "socket.io-client"
import { FDC3_APP_EVENT, FDC3_DA_EVENT } from "@finos/fdc3-sail-common"

/* eslint-disable  @typescript-eslint/no-explicit-any */
export function link(socket: Socket, channel: MessageChannel, source: InstanceID) {
    socket.on(FDC3_DA_EVENT, (data: any) => {
        // console.log(`DA Sent ${JSON.stringify(data)} from socket`)
        channel.port2.postMessage(data)
    })

    channel.port2.onmessage = function (event) {
        // console.log(`App Sent ${JSON.stringify(event.data)} from message port`)
        socket.emit(FDC3_APP_EVENT, event.data, source)
    }
}

export function getQueryVariable(variable: string): string {
    const query = window.location.search.substring(1);
    const vars = query.split("&");
    for (let i = 0; i < vars.length; i++) {
        const pair = vars[i].split("=");
        if (pair[0] == variable) {
            return pair[1];
        }
    }

    return ""

}

export function getUserSessionId(): string {
    const uuid = getQueryVariable("desktopAgentId")
    return uuid
}

export function getInstanceId(): string {
    const source = getQueryVariable("instanceId")
    return source
}

export function getAppId(): string {
    const source = getQueryVariable("appId")
    return source
}
