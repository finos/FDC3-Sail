import { ChannelSelector, DesktopAgent } from "@finos/fdc3-standard";
import { WebSocketMessaging } from "./WebSocketMessaging";
import { ChannelSupport, DefaultAppSupport, DefaultChannelSupport, DefaultHeartbeatSupport, DefaultIntentSupport, DesktopAgentProxy } from "@finos/fdc3-agent-proxy";
import { ElectronAppResponse } from "@finos/fdc3-sail-common";
import { DefaultDesktopAgentChannelSelector, DefaultDesktopAgentIntentResolver, NullChannelSelector, NullIntentResolver } from "../../../FDC3/packages/fdc3-get-agent/dist/src";

export async function createSailDesktopAgent(messaging: WebSocketMessaging, details: ElectronAppResponse): Promise<DesktopAgent> {

    const intentResolver = details.intentResolver
        ? new DefaultDesktopAgentIntentResolver(details.intentResolver)
        : new NullIntentResolver();

    const channelSelector = details.channelSelector
        ? new DefaultDesktopAgentChannelSelector(details.channelSelector)
        : new NullChannelSelector();

    const hs = new DefaultHeartbeatSupport(messaging);
    const cs = new DefaultChannelSupport(messaging, channelSelector);
    const is = new DefaultIntentSupport(messaging, intentResolver);
    const as = new DefaultAppSupport(messaging);
    const da = new DesktopAgentProxy(hs, cs, is, as, [hs, intentResolver, channelSelector]);

    await da.connect();
    await populateChannelSelector(cs, channelSelector);
    return da;
}


async function populateChannelSelector(cs: ChannelSupport, channelSelector: ChannelSelector): Promise<void> {
    const channel = await cs.getUserChannel();
    const userChannels = await cs.getUserChannels();
    channelSelector.updateChannel(channel?.id ?? null, userChannels);
}