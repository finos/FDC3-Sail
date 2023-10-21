import { DesktopAgent, IntentResolution, TargetApp, AppMetadata } from "fdc3-1.2";
import { SendMessage } from "../message";
import { Context, SailAppIntent } from "/@main/types/FDC3Message";
import { FDC3_2_0_TOPICS } from "/@main/handlers/fdc3/2.0/topics";
import { INTENT_TIMEOUT, convertTarget, guid } from "../lib/lib";
import { ResolverTimeout } from "/@main/types/FDC3Errors";
import { FDC3Listener, SailContextHandler, getContextListeners, createListenerItem, getIntentListeners } from "./listeners";
import { createChannelObject } from "./channel";
import { SailChannelData, SailIntentResolution } from "/@main/types/FDC3Data";

function setupResolverListener(resolve: (value: IntentResolution) => void, version: string, intent?: string) {
    let intentTimeout = -1;
    //listen for resolve intent
    document.addEventListener(
        FDC3_2_0_TOPICS.RESOLVE_INTENT,
        (event: Event) => {
            const cEvent = event as CustomEvent;
            console.log('***** intent resolution received', cEvent.detail);
            if (intentTimeout) {
                window.clearTimeout(intentTimeout);
            }

            resolve({
                version: version,
                source: cEvent.detail?.source || { name: 'unknown' },
            });
        },
        { once: true },
    );
}

export function createDesktopAgentInstance(sendMessage: SendMessage, version: string) : DesktopAgent{

    return {

        getInfo() {
            return {
                fdc3Version: version,
                provider: 'fdc3-sail',
            };
        },

        async open(app: TargetApp, context?: Context) {
            return await sendMessage(FDC3_2_0_TOPICS.OPEN, {
                target: convertTarget(app),
                context: context,
            });
        },

        async broadcast(context: Context) {
            return await sendMessage(FDC3_2_0_TOPICS.BROADCAST, { context: context });
        },

        raiseIntent(intent: string, context: Context, app?: any) {
            return new Promise<IntentResolution>((resolve, reject) => {
                const target = convertTarget(app);

                sendMessage(FDC3_2_0_TOPICS.RAISE_INTENT, {
                    intent: intent,
                    context: context,
                    target: target,
                    fdc3Version: version
                }).then(
                    (result : SailIntentResolution) => {
                        console.log('***** got intent result ', result);
                        if (result.openingResolver) {
                            setupResolverListener(resolve, version, result.intent);
                        } else {
                            resolve({
                                source: result.source?.name!!,
                                version: result.version,
                            });
                        }
                    },
                    (error) => {
                        console.log('***** rejecting ', error);
                        reject(error);
                    },
                );

                //timeout the intent resolution
                window.setTimeout(() => {
                    reject(new Error(ResolverTimeout));
                }, INTENT_TIMEOUT);
            });
        },

        async raiseIntentForContext(context: Context, app?: any) {
            return await sendMessage(FDC3_2_0_TOPICS.RAISE_INTENT_FOR_CONTEXT, {
                context: context,
                target: convertTarget(app),
            });
        },

        addContextListener(contextType: SailContextHandler | string | null, handler?: SailContextHandler) {
            const thisListener: SailContextHandler = handler
                ? handler
                : (contextType as SailContextHandler);
            const thisContextType: string | undefined =
                contextType && handler ? (contextType as string) : undefined;
            const listenerId: string = guid();
            console.log('add context listener', listenerId);
            getContextListeners().set(
                listenerId,
                createListenerItem(listenerId, thisListener, thisContextType),
            );

            sendMessage(FDC3_2_0_TOPICS.ADD_CONTEXT_LISTENER, {
                listenerId: listenerId,
                contextType: thisContextType,
            });
            console.log('added context listener', listenerId, contextType);
            console.log('Intent (DAc)', getIntentListeners());
            console.log('Context (DAc)', getContextListeners());

            return new FDC3Listener('context', listenerId, sendMessage);
        },

        addIntentListener(intent: string, listener: SailContextHandler) {
            const listenerId: string = guid();
            console.log('add intent listener', listenerId);

            if (!getIntentListeners().has(intent)) {
                getIntentListeners().set(intent, new Map());
            }

            const listeners = getIntentListeners().get(intent);
            if (listeners) {
                listeners.set(listenerId, createListenerItem(listenerId, listener));

                sendMessage(FDC3_2_0_TOPICS.ADD_INTENT_LISTENER, {
                    listenerId: listenerId,
                    intent: intent,
                });
            }
            console.log('added intent listener', listenerId, getIntentListeners());

            console.log('Intent (DAi)', getIntentListeners());
            console.log('Context (DAi)', getContextListeners());
    
            return new FDC3Listener('intent', listenerId, sendMessage, intent);
        },

        async findIntent(intent: string, context: Context) {
            const sai : SailAppIntent = await sendMessage(FDC3_2_0_TOPICS.FIND_INTENT, {
                intent: intent,
                context: context,
            });

            const apps: AppMetadata[] = sai.apps.map(m => {
                return {
                    name: m.name ?? m.appId ?? "unknown",
                    version: m.version,
                    title: m.title,
                    tooltip: m.tooltip,
                    description: m.description,
                    icons: m.icons?.map(i => i.src ?? "undefined"),
                    images: m.screenshots?.map(s => s.src ?? "undefined")
                }
            })

            return {
                intent: sai.intent,
                apps
            }
        },

        async findIntentsByContext(context: Context) {
            return await sendMessage(FDC3_2_0_TOPICS.FIND_INTENTS_BY_CONTEXT, {
                context: context,
            });
        },

        async getSystemChannels() {
            const r: Array<SailChannelData> = await sendMessage(
                FDC3_2_0_TOPICS.GET_USER_CHANNELS,
                {},
            );
            console.log('result', r);
            const channels = r.map((c: SailChannelData) => {
                return createChannelObject(
                    sendMessage,
                    c.id,
                    'system',
                    c.displayMetadata || { name: c.id },
                );
            });
            return channels;
        },

        async getOrCreateChannel(channelId: string) {
            const result: SailChannelData = await sendMessage(
                FDC3_2_0_TOPICS.GET_OR_CREATE_CHANNEL,
                { channel: channelId },
            );

            return createChannelObject(
                sendMessage,
                result.id,
                result.type,
                result.displayMetadata || { name: result.id },
            );
        },

        async joinChannel(channel: string) {
            return await sendMessage(FDC3_2_0_TOPICS.JOIN_CHANNEL, {
                channel: channel,
            });
        },

        async leaveCurrentChannel() {
            return await sendMessage(FDC3_2_0_TOPICS.LEAVE_CURRENT_CHANNEL, {});
        },

        async getCurrentChannel() {
            const result: SailChannelData = await sendMessage(
                FDC3_2_0_TOPICS.GET_CURRENT_CHANNEL,
                {},
            );

            return result == null
                ? null
                : createChannelObject(
                    sendMessage,
                    result.id,
                    result.type,
                    result.displayMetadata || { name: result.id },
                );
        }

    }
};

