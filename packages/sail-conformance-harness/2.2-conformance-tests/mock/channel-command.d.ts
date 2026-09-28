import { ChannelsAppConfig } from '../test/support/channel-control';
import { IChannelService } from './interfaces';
export declare class Fdc3CommandExecutor {
    executeCommands(orderedCommands: string[], config: ChannelsAppConfig, channelService: IChannelService): Promise<void>;
}
