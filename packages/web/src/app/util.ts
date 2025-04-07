import { InstanceID } from "@finos/fdc3-web-impl"
import { io, Socket } from "socket.io-client"
import { CHANNEL_RECEIVER_HELLO, CHANNEL_RECEIVER_UPDATE, ChannelReceiverHelloRequest, ChannelReceiverUpdate, FDC3_APP_EVENT, FDC3_DA_EVENT, SAIL_INTENT_RESOLVE_ON_CHANNEL, SailIntentResolveOpenChannelArgs, TabDetail } from "@finos/fdc3-sail-common"


export const channels: TabDetail[] = []
const socket = io()

export function handleChannelUpdates(renderChannels: () => void) {
    socket.on("connect", async () => {
        const msg: ChannelReceiverHelloRequest = {
            userSessionId: getUserSessionId(),
            instanceId: getInstanceId(),
        }
        const result: ChannelReceiverUpdate | undefined = await socket.emitWithAck(CHANNEL_RECEIVER_HELLO, msg)
        if (result) {
            channels.length = 0;
            channels.push(...result.tabs)
            renderChannels()
        }
    })

    socket.on(CHANNEL_RECEIVER_UPDATE, (data: ChannelReceiverUpdate) => {
        channels.length = 0;
        channels.push(...data.tabs)
        renderChannels()
    })
}

export async function setAppChannel(appId: string, channel: string): Promise<void> {

    const msg: SailIntentResolveOpenChannelArgs = {
        appId,
        channel
    }

    await socket.emitWithAck(SAIL_INTENT_RESOLVE_ON_CHANNEL, msg)
    console.log("SET APP CHANNEL: " + JSON.stringify(msg))
}

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
