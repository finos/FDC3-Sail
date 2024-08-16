import { AppMetadata } from "@finos/fdc3";
import { FDC3Server } from "./FDC3Server";
import { ServerContext } from "./ServerContext";
import { Directory } from "../appd/DirectoryInterface";
import { OpenHandler } from "../handlers/OpenHandler";

export interface MessageHandler {

    /**
     * Handles an AgentRequestMessage from the messaging source
     */
    accept(msg: any, sc: ServerContext, from: AppMetadata): void
}

/**
 * This defers all functionality to either MessageHandler's or the ServerContext objects.
 */
export class BasicFDC3Server implements FDC3Server {

    private handlers: MessageHandler[]
    private sc: ServerContext

    constructor(handlers: MessageHandler[], sc: ServerContext) {
        this.handlers = handlers
        this.sc = sc;
    }

    receive(message: any, from: AppMetadata): void {
        this.sc.log(`MessageReceived: \n ${JSON.stringify(message, null, 2)}`)
        this.handlers.forEach(h => h.accept(message, this.sc, from))
    }
}

export class DefaultFDC3Server extends BasicFDC3Server {

    constructor(sc: ServerContext, directory: Directory, _name: string, _userChannels: ChannelState, _timeoutMs: number = 20000) {
        super([
            new OpenHandler(directory)
        ], sc)
    }
}