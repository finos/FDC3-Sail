import { FDC3Server } from "./FDC3Server";
import { InstanceID, ServerContext } from "./ServerContext";
import { BroadcastHandler, ChannelState } from "./handlers/BroadcastHandler";
import { IntentHandler } from "./handlers/IntentHandler";
import { Directory } from "./directory/DirectoryInterface";
import { OpenHandler } from "./handlers/OpenHandler";
import { BrowserTypes } from "@kite9/fdc3-schema";
import { HeartbeatHandler } from "./handlers/HeartbeatHandler";

type AppRequestMessage = BrowserTypes.AppRequestMessage
type WebConnectionProtocol4ValidateAppIdentity = BrowserTypes.WebConnectionProtocol4ValidateAppIdentity

export interface MessageHandler {

    /**
     * Handles an AgentRequestMessage from the messaging source
     */
    accept(msg: any, sc: ServerContext<any>, from: InstanceID): void

    shutdown(): void
}

/**
 * This defers all functionality to either MessageHandler's or the ServerContext objects.
 */
export class BasicFDC3Server implements FDC3Server {

    private handlers: MessageHandler[]
    private sc: ServerContext<any>

    constructor(handlers: MessageHandler[], sc: ServerContext<any>) {
        this.handlers = handlers
        this.sc = sc;
    }

    receive(message: AppRequestMessage | WebConnectionProtocol4ValidateAppIdentity, from: InstanceID): void {
        // this.sc.log(`MessageReceived: \n ${JSON.stringify(message, null, 2)}`)
        this.handlers.forEach(h => h.accept(message, this.sc, from))
    }

    shutdown(): void {
        this.handlers.forEach(h => h.shutdown())
    }
}

export class DefaultFDC3Server extends BasicFDC3Server {

    constructor(sc: ServerContext<any>, directory: Directory, userChannels: ChannelState[], heartbeats: boolean, intentTimeoutMs: number = 20000, openHandlerTimeoutMs: number = 3000) {
        const handlers: MessageHandler[] = [
            new BroadcastHandler(userChannels),
            new IntentHandler(directory, intentTimeoutMs),
            new OpenHandler(directory, openHandlerTimeoutMs),
        ]

        if (heartbeats) {
            handlers.push(new HeartbeatHandler(openHandlerTimeoutMs / 4, openHandlerTimeoutMs / 2, openHandlerTimeoutMs))
        }

        super(handlers, sc)
    }
}