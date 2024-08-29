import { SailDirectory } from "../appd/SailDirectory";
import { OpenHandler } from "../handlers/OpenHandler";
import { BasicFDC3Server } from "./BasicFDC3Server";
import { ServerContext } from "./ServerContext";
import { HelloArgs } from "./message-types";

/**
 * Extends BasicFDC3Server to allow for more detailed (and changeable) user channel metadata
 * as well as user-configurable SailDirectory.
 */
export class SailFDC3Server extends BasicFDC3Server {

    protected readonly directory: SailDirectory

    constructor(sc: ServerContext, helloArgs: HelloArgs) {
        const dir = new SailDirectory()
        const oh = new OpenHandler(dir)

        super([oh], sc)
        dir.replace(helloArgs.directories)

        this.directory = dir
    }

    getDirectory() {
        return this.directory
    }

    getBroadcastHandler() {
        return null as any
    }
}