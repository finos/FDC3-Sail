import { DesktopAgentHelloArgs, TabDetail } from "@finos/fdc3-sail-shared"
import {
  ChannelState,
  ChannelType,
  DefaultFDC3Server,
} from "@finos/fdc3-web-impl"
import { SailAppInstanceManager } from "./sailAppInstanceManager"

export const mapChannels = (channels: TabDetail[]): ChannelState[] =>
  channels.map((channel) => ({
    id: channel.id,
    type: ChannelType.user,
    displayMetadata: {
      name: channel.id,
      glyph: channel.icon,
      color: channel.background,
    },
    context: [],
  }))

/**
 * Extends BasicFDC3Server to allow for more detailed (and changeable) user channel metadata
 * as well as user-configurable SailDirectory.
 */
export class SailFDC3Server extends DefaultFDC3Server {
  readonly serverContext: SailAppInstanceManager

  constructor(sc: SailAppInstanceManager, helloArgs: DesktopAgentHelloArgs) {
    super(sc, sc.directory, mapChannels(helloArgs.channels), true, 60000, 20000)
    this.serverContext = sc
    // Note: Directory loading is now handled async in the handler
  }

  /**
   * Loads the directory with the provided directories
   * @param directories - Array of directory URLs or file paths
   */
  async loadDirectories(directories: string[]): Promise<void> {
    await this.serverContext.directory.replace(directories)
  }

  getDirectory() {
    return this.serverContext.directory
  }

  getServerContext() {
    return this.serverContext
  }
}
