import { MessageHandler } from "../BasicFDC3Server";
import { InstanceID, ServerContext } from "../ServerContext";
import { Context } from "@kite9/fdc3-context";
import { AppIdentifier, ChannelError, DisplayMetadata } from "@kite9/fdc3-standard";
import { successResponse, errorResponse, onlyUnique } from "./support";
import { BrowserTypes } from "@kite9/fdc3-schema";

type PrivateChannelEventListenerTypes = BrowserTypes.PrivateChannelEventListenerTypes
type GetCurrentContextRequest = BrowserTypes.GetCurrentContextRequest
type BroadcastRequest = BrowserTypes.BroadcastRequest
type ContextListenerUnsubscribeRequest = BrowserTypes.ContextListenerUnsubscribeRequest
type AddContextListenerRequest = BrowserTypes.AddContextListenerRequest
type PrivateChannelDisconnectRequest = BrowserTypes.PrivateChannelDisconnectRequest
type PrivateChannelAddEventListenerRequest = BrowserTypes.PrivateChannelAddEventListenerRequest
type PrivateChannelUnsubscribeEventListenerRequest = BrowserTypes.PrivateChannelUnsubscribeEventListenerRequest
type GetOrCreateChannelRequest = BrowserTypes.GetOrCreateChannelRequest
type GetUserChannelsRequest = BrowserTypes.GetUserChannelsRequest
type LeaveCurrentChannelRequest = BrowserTypes.LeaveCurrentChannelRequest
type JoinUserChannelRequest = BrowserTypes.JoinUserChannelRequest
type GetCurrentChannelRequest = BrowserTypes.GetCurrentChannelRequest
type AgentEventMessage = BrowserTypes.AgentEventMessage
type CreatePrivateChannelRequest = BrowserTypes.CreatePrivateChannelRequest

type ContextListenerRegistration = {
    appId: string,
    instanceId: string,
    listenerUuid: string,
    channelId: string | null,
    contextType: string | null
    userChannelListener: boolean
}

type NotificationAgentEventMessage = 'privateChannelOnAddContextListenerEvent' | 'privateChannelOnDisconnectEvent' | 'privateChannelOnUnsubscribeEvent'

type PrivateChannelEventListener = {
    appId: string,
    instanceId: string,
    channelId: string,
    eventType: PrivateChannelEventListenerTypes,
    listenerUuid: string
}

export enum ChannelType { 'user', 'app', 'private' }

export type ChannelState = {
    id: string,
    type: ChannelType,
    context: Context[],
    displayMetadata: DisplayMetadata
}

export class BroadcastHandler implements MessageHandler {

    private contextListeners: ContextListenerRegistration[] = []
    private readonly eventListeners: PrivateChannelEventListener[] = []
    private readonly state: ChannelState[] = []
    private readonly currentChannel: { [instanceId: string]: ChannelState } = {}

    constructor(initialChannelState: ChannelState[]) {
        this.state = initialChannelState
    }

    shutdown(): void {
    }

    getCurrentChannel(from: AppIdentifier): ChannelState | null {
        return this.currentChannel[from.instanceId!!]
    }

    getChannelById(id: string | null): ChannelState | null {
        if (id == null) {
            return null
        }
        return this.state.find(c => c.id == id) ?? null
    }

    convertChannelTypeToString(type: ChannelType): string {
        switch (type) {
            case ChannelType.app: return 'app'
            case ChannelType.user: return 'user'
            case ChannelType.private: return 'private'
        }
    }

    getListeners(appId: AppIdentifier) {
        return this.contextListeners.filter(r => r.instanceId == appId.instanceId)
    }

    moveUserChannelListeners(app: AppIdentifier, channelId: string | null) {
        this.getListeners(app)
            .filter(l => l.userChannelListener)
            .forEach(l => {
                l.channelId = channelId
            })
    }

    updateChannelState(channelId: string, context: Context) {
        const cs = this.getChannelById(channelId)
        if (cs) {
            cs.context = cs.context.filter(c => c.type != context.type)
            cs.context.unshift(context)
        }
    }

    accept(msg: any, sc: ServerContext<any>, uuid: InstanceID) {
        const from = sc.getInstanceDetails(uuid)

        if (from == null) {
            // this handler only deals with connected apps
            return
        }

        try {

            switch (msg.type as string | null) {
                // app channels registration
                case 'getOrCreateChannelRequest': return this.handleGetOrCreateRequest(msg as GetOrCreateChannelRequest, sc, from)

                // user channel management
                case 'getUserChannelsRequest': return this.handleGetUserChannelsRequest(msg as GetUserChannelsRequest, sc, from)
                case 'leaveCurrentChannelRequest': return this.handleLeaveCurrentChannelRequest(msg as LeaveCurrentChannelRequest, sc, from)
                case 'joinUserChannelRequest': return this.handleJoinUserChannelRequest(msg as JoinUserChannelRequest, sc, from)
                case 'getCurrentChannelRequest': return this.handleGetCurrentChannelRequest(msg as GetCurrentChannelRequest, sc, from)

                // general broadcast
                case 'broadcastRequest': return this.handleBroadcastRequest(msg as BroadcastRequest, sc, from)

                // context listeners
                case 'addContextListenerRequest': return this.handleAddContextListenerRequest(msg as AddContextListenerRequest, sc, from)
                case 'contextListenerUnsubscribeRequest': return this.handleContextListenerUnsubscribeRequest(msg as ContextListenerUnsubscribeRequest, sc, from)

                // private channels create/disconnect
                case 'createPrivateChannelRequest': return this.handleCreatePrivateChannelRequest(msg as CreatePrivateChannelRequest, sc, from)
                case 'privateChannelDisconnectRequest': return this.handlePrivateChannelDisconnectRequest(msg as PrivateChannelDisconnectRequest, sc, from)

                // private channel event listeners
                case 'privateChannelAddEventListenerRequest': return this.handlePrivateChannelAddEventListenerRequest(msg as PrivateChannelAddEventListenerRequest, from, sc)
                case 'privateChannelUnsubscribeEventListenerRequest': return this.handlePrivateChannelUnsubscribeEventListenerRequest(msg as PrivateChannelUnsubscribeEventListenerRequest, sc, from)

                // handling state synchronisation of channels
                case 'getCurrentContextRequest': return this.handleGetCurrentContextRequest(msg as GetCurrentContextRequest, sc, from)
            }
        } catch (e: any) {
            const responseType = msg.type.replace(new RegExp("Request$"), 'Response')
            errorResponse(sc, msg, from, e.message ?? e, responseType)
        }
    }

    handleCreatePrivateChannelRequest(arg0: CreatePrivateChannelRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const id = sc.createUUID()
        this.state.push({
            id,
            type: ChannelType.private,
            context: [],
            displayMetadata: {
            }
        })

        successResponse(sc, arg0, from, { privateChannel: { id, type: this.convertChannelTypeToString(ChannelType.private) } }, 'createPrivateChannelResponse')
    }

    handleGetCurrentContextRequest(arg0: GetCurrentContextRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const channel = this.getChannelById(arg0.payload.channelId)
        const type = arg0.payload.contextType

        if (channel) {
            const context = type ? (channel.context.find(c => c.type == type) ?? null) : (channel.context[0] ?? null)
            successResponse(sc, arg0, from, { context: context }, 'getCurrentContextResponse')
        } else {
            errorResponse(sc, arg0, from, ChannelError.NoChannelFound, 'getCurrentContextResponse')
        }
    }

    handlePrivateChannelUnsubscribeEventListenerRequest(arg0: PrivateChannelUnsubscribeEventListenerRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const i = this.eventListeners.findIndex(r => r.listenerUuid == arg0.payload.listenerUUID)
        if (i > -1) {
            this.eventListeners.splice(i, 1)
            successResponse(sc, arg0, from, {}, 'privateChannelUnsubscribeEventListenerResponse')
        } else {
            errorResponse(sc, arg0, from, "ListenerNotFound", 'privateChannelUnsubscribeEventListenerResponse')
        }
    }

    handlePrivateChannelDisconnectRequest(arg0: PrivateChannelDisconnectRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const toUnsubscribe = this.contextListeners
            .filter(r => (r.appId == from.appId) && (r.instanceId == from.instanceId))
            .filter(r => r.channelId == arg0.payload.channelId)

        toUnsubscribe.forEach(u => {
            this.invokeEventListeners(arg0.payload.channelId, "onUnsubscribe", 'privateChannelOnUnsubscribeEvent', sc, u.contextType ?? undefined)
        })

        this.contextListeners = this.contextListeners.filter(r => !toUnsubscribe.includes(r))
        this.invokeEventListeners(arg0.payload.channelId, "onDisconnect", 'privateChannelOnDisconnectEvent', sc)
        successResponse(sc, arg0, from, {}, 'privateChannelDisconnectResponse')
    }

    handleContextListenerUnsubscribeRequest(arg0: ContextListenerUnsubscribeRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const i = this.contextListeners
            .findIndex(r => (r.listenerUuid == arg0.payload.listenerUUID) && (r.instanceId == from.instanceId))

        if (i > -1) {
            const rl = this.contextListeners[i]
            const channel = this.getChannelById(rl.channelId)
            this.invokeEventListeners(channel?.id ?? null, "onUnsubscribe", 'privateChannelOnUnsubscribeEvent', sc, rl.contextType ?? undefined)
            this.contextListeners.splice(i, 1)
            successResponse(sc, arg0, from, {}, 'contextListenerUnsubscribeResponse')
        } else {
            errorResponse(sc, arg0, from, "ListenerNotFound", 'contextListenerUnsubscribeResponse')
        }
    }

    handleAddContextListenerRequest(arg0: AddContextListenerRequest, sc: ServerContext<any>, from: AppIdentifier) {
        var channelId = null
        var channelType = ChannelType.user

        if (arg0.payload?.channelId) {
            const channel = this.getChannelById(arg0.payload?.channelId)
            channelType = channel?.type ?? ChannelType.user

            if (channel == null) {
                errorResponse(sc, arg0, from, ChannelError.NoChannelFound, 'addContextListenerResponse')
                return
            } else {
                channelId = channel.id
            }
        }

        const lr: ContextListenerRegistration = {
            appId: from.appId,
            instanceId: from.instanceId ?? 'no-instance-id',
            channelId: channelId,
            listenerUuid: sc.createUUID(),
            contextType: arg0.payload.contextType,
            userChannelListener: channelType == ChannelType.user
        }

        this.contextListeners.push(lr)
        this.invokeEventListeners(channelId, "onAddContextListener", "privateChannelOnAddContextListenerEvent", sc, arg0.payload.contextType ?? undefined)
        successResponse(sc, arg0, from, { listenerUUID: lr.listenerUuid }, 'addContextListenerResponse')

    }

    handleBroadcastRequest(arg0: BroadcastRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const matchingListeners = this.contextListeners
            .filter(r => r.channelId == arg0.payload.channelId)
            .filter(r => r.contextType == null || r.contextType == arg0.payload.context.type)

        const matchingApps = matchingListeners
            .map(r => { return { appId: r.appId, instanceId: r.instanceId } })
            .filter(onlyUnique)

        matchingApps.forEach(app => {
            sc.post({
                meta: {
                    eventUuid: sc.createUUID(),
                    timestamp: new Date()
                },
                type: 'broadcastEvent',
                payload: {
                    channelId: arg0.payload.channelId,
                    context: arg0.payload.context
                }
            }, app.instanceId)
        })

        this.updateChannelState(arg0.payload.channelId, arg0.payload.context)
        successResponse(sc, arg0, from, {}, 'broadcastResponse')
    }

    handleGetCurrentChannelRequest(arg0: GetCurrentChannelRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const currentChannel = this.getCurrentChannel(from)
        if (currentChannel) {
            successResponse(sc, arg0, from, {
                channel: {
                    id: currentChannel.id,
                    type: this.convertChannelTypeToString(currentChannel.type),
                    displayMetadata: currentChannel.displayMetadata
                }
            }, 'getCurrentChannelResponse')
        } else {
            successResponse(sc, arg0, from, { channel: null }, 'getCurrentChannelResponse')
        }
    }

    handleJoinUserChannelRequest(arg0: JoinUserChannelRequest, sc: ServerContext<any>, from: AppIdentifier) {
        // check it's a user channel
        const newChannel = this.getChannelById(arg0.payload.channelId)
        if ((newChannel == null) || (newChannel.type != ChannelType.user)) {
            return errorResponse(sc, arg0, from, ChannelError.NoChannelFound, 'joinUserChannelResponse')
        }

        // join it.  
        const instanceId = from.instanceId ?? 'no-instance-id'
        this.currentChannel[instanceId] = newChannel
        this.moveUserChannelListeners(from, newChannel.id)
        successResponse(sc, arg0, from, {}, 'joinUserChannelResponse')
    }

    handleLeaveCurrentChannelRequest(arg0: LeaveCurrentChannelRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const instanceId = from.instanceId ?? 'no-instance-id'
        const currentChannel = this.currentChannel[instanceId]
        if (currentChannel) {
            delete this.currentChannel[instanceId]
            this.moveUserChannelListeners(from, null)
        }
        successResponse(sc, arg0, from, {}, 'leaveCurrentChannelResponse')
    }

    handleGetOrCreateRequest(arg0: GetOrCreateChannelRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const id = arg0.payload.channelId
        var channel = this.getChannelById(id)
        if (channel) {
            if (channel.type != ChannelType.app) {
                errorResponse(sc, arg0, from, ChannelError.AccessDenied, 'getOrCreateChannelResponse')
                return
            }
        }

        channel = {
            id: id,
            type: ChannelType.app,
            context: [],
            displayMetadata: {}
        }
        this.state.push(channel)
        successResponse(sc, arg0, from, { channel: { id: channel.id, type: channel.type, } }, 'getOrCreateChannelResponse')
    }


    handleGetUserChannelsRequest(arg0: GetUserChannelsRequest, sc: ServerContext<any>, from: AppIdentifier) {
        const userChannels = this.state.filter(c => c.type == ChannelType.user)
        successResponse(sc, arg0, from, { userChannels: userChannels.map(c => ({ id: c.id, type: this.convertChannelTypeToString(c.type), displayMetadata: c.displayMetadata })) }, 'getUserChannelsResponse')
    }

    handlePrivateChannelAddEventListenerRequest(arg0: PrivateChannelAddEventListenerRequest, from: AppIdentifier, sc: ServerContext<any>) {
        const channel = this.getChannelById(arg0.payload.privateChannelId)

        if ((channel == null) || (channel.type != ChannelType.private)) {
            errorResponse(sc, arg0, from, ChannelError.NoChannelFound, 'privateChannelAddEventListenerResponse')
        } else {
            const el = {
                appId: from.appId!!,
                instanceId: from.instanceId!!,
                channelId: arg0.payload.privateChannelId,
                eventType: arg0.payload.listenerType,
                listenerUuid: sc.createUUID(),
            } as PrivateChannelEventListener
            this.eventListeners.push(el)
            successResponse(sc, arg0, from, { listenerUUID: el.listenerUuid }, 'privateChannelAddEventListenerResponse')
        }
    }

    invokeEventListeners(privateChannelId: string | null, eventType: PrivateChannelEventListenerTypes, messageType: NotificationAgentEventMessage, sc: ServerContext<any>, contextType?: string) {
        if (privateChannelId) {
            const msg = {
                type: messageType,
                meta: {
                    eventUuid: sc.createUUID(),
                    timestamp: new Date()
                },
                payload: {
                    privateChannelId,
                    contextType: contextType
                }
            } as AgentEventMessage

            this.eventListeners
                .filter(e => (e.channelId == privateChannelId) && (e.eventType == eventType))
                .forEach(e => sc.post(msg, e.instanceId))
        }
    }

}


