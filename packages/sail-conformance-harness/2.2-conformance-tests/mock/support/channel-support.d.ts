import { Channel, DesktopAgent } from '@finos/fdc3';
import { IChannelService } from '../interfaces';
export declare class ChannelServiceImpl implements IChannelService {
    constructor(fdc3: DesktopAgent);
    private fdc3;
    joinRetrievedUserChannel(channelId: string): Promise<Channel>;
    retrieveTestAppChannel(channelId: string): Promise<Channel>;
    broadcastContextItem(contextType: string, channel: Channel, historyItems: number, testId: string): Promise<void>;
    closeWindowOnCompletion(testId: string): Promise<void>;
    notifyTestOnCompletion(testId: string): Promise<void>;
    private getBroadcastService;
    private appChannelBroadcastService;
    private systemChannelBroadcastService;
}
