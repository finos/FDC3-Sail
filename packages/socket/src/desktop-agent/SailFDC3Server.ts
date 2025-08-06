import { DesktopAgentHelloArgs, TabDetail } from "@finos/fdc3-sail-common"
import { ChannelState, ChannelType, DefaultFDC3Server } from "@finos/fdc3-web-impl"
import { SailServerContext } from "./SailServerContext";


export function mapChannels(channels: TabDetail[]): ChannelState[] {
    const out = channels.map((c) => {
        return {
            id: c.id,
            type: ChannelType.user,
            displayMetadata: {
                name: c.id,
                glyph: c.icon,
                color: c.background,
            },
            context: []
        }
    })

    return out
}

/**
 * Extends BasicFDC3Server to allow for more detailed (and changeable) user channel metadata
 * as well as user-configurable SailDirectory.
 */
export class SailFDC3Server extends DefaultFDC3Server {

    readonly serverContext: SailServerContext

    constructor(sc: SailServerContext, helloArgs: DesktopAgentHelloArgs) {
        super(sc, sc.directory, mapChannels(helloArgs.channels), true, 60000, 20000)
        sc.directory.replace(helloArgs.directories)
        this.serverContext = sc
    }

    getDirectory() {
        return this.serverContext.directory
    }

    getServerContext() {
        return this.serverContext
    }
}