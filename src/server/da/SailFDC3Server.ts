import { DesktopAgentHelloArgs } from "./message-types";
import { DefaultFDC3Server } from "@kite9/da-server"
import { SailServerContext } from "./SailServerContext";


/**
 * Extends BasicFDC3Server to allow for more detailed (and changeable) user channel metadata
 * as well as user-configurable SailDirectory.
 */
export class SailFDC3Server extends DefaultFDC3Server {

    readonly serverContext: SailServerContext

    constructor(sc: SailServerContext, helloArgs: DesktopAgentHelloArgs) {
        super(sc, sc.directory, helloArgs.channels)
        sc.directory.replace(helloArgs.directories)
        this.serverContext = sc
    }

    getDirectory() {
        return this.serverContext.directory
    }

    getBroadcastHandler() {
        return null as any
    }

    getServerContext() {
        return this.serverContext
    }
}