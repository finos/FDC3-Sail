import { Socket } from "socket.io";
import { v4 as uuidv4 } from 'uuid'
import { AppRegistration, ChannelState, DirectoryApp, FDC3Server, InstanceID, ServerContext, State } from "@finos/fdc3-web-impl"
import { AppIdentifier } from "@finos/fdc3";
import { getIcon, SailDirectory } from "../appd/SailDirectory";
import { AppIntent, Context, OpenError } from "@finos/fdc3";
import { FDC3_DA_EVENT, SAIL_APP_OPEN, SAIL_CHANNEL_SETUP, SAIL_INTENT_RESOLVE, SailAppOpenArgs, AppHosting, SailIntentResolveResponse, AugmentedAppIntent, AugmentedAppMetadata, SailAppOpenResponse, TabDetail, ContextHistory, SAIL_BROADCAST_CONTEXT } from "@finos/fdc3-sail-common";
import { BroadcastRequest, ChannelChangedEvent } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes";
import { mapChannels } from "./SailFDC3Server";


/**
 * Represents the state of a Sail app.
 * Pending: App has a window, but isn't connected to FDC3
 * Open: App is connected to FDC3
 * NotResponding: App is not responding to heartbeats
 * Terminated: App Window has been closed
 */
export type SailData = AppRegistration & {
    socket?: Socket,
    channelSockets: Socket[],
    url?: string,
    hosting: AppHosting,
    channel: string | null,
    instanceTitle: string
}

export class SailServerContext implements ServerContext<SailData> {

    readonly directory: SailDirectory
    private instances: SailData[] = []
    private fdc3Server: FDC3Server | undefined
    private readonly socket: Socket
    private readonly appStartDestinations: Map<string, string | null> = new Map()

    constructor(directory: SailDirectory, socket: Socket) {
        this.directory = directory
        this.socket = socket
    }

    setFDC3Server(server: FDC3Server): void {
        this.fdc3Server = server
    }

    post(message: object, instanceId: InstanceID): Promise<void> {
        const instance = this.instances.find(i => i.instanceId == instanceId)
        if (instance) {
            if (!(message as { type?: string })?.type?.startsWith("heartbeat")) {
                this.log("Posting message to app: " + JSON.stringify(message))
            }
            instance.socket?.emit(FDC3_DA_EVENT, message)
        } else {
            this.log(`Can't find app: ${JSON.stringify(instanceId)}`)
        }
        return Promise.resolve()
    }

    notifyBroadcastContext(broadcastEvent: BroadcastRequest) {
        const channel = broadcastEvent.payload.channelId
        const context = broadcastEvent.payload.context
        this.socket.emit(SAIL_BROADCAST_CONTEXT, {
            channelId: channel,
            context: context
        })
    }

    async open(appId: string): Promise<InstanceID> {
        const destination = this.appStartDestinations.get(appId)
        this.appStartDestinations.delete(appId)
        return this.openSail(appId, destination ?? null)
    }

    async openOnChannel(appId: string, channel: string): Promise<void> {
        this.appStartDestinations.set(appId, channel)
    }

    async openSail(appId: string, channel: string | null): Promise<InstanceID> {
        const app: DirectoryApp[] = this.directory.retrieveAppsById(appId)

        if (app.length == 0) {
            throw new Error(OpenError.AppNotFound)
        }

        const url = (app[0].details as { url?: string })?.url ?? undefined
        if (url) {
            const forceNewWindow = (app[0].hostManifests as { sail?: { forceNewWindow?: boolean } })?.sail?.forceNewWindow
            const approach = forceNewWindow || (channel === null) ? AppHosting.Tab : AppHosting.Frame

            const details: SailAppOpenResponse = await this.socket.emitWithAck(SAIL_APP_OPEN, {
                appDRecord: app[0],
                approach,
                channel
            } as SailAppOpenArgs)

            this.setInstanceDetails(details.instanceId, {
                appId,
                instanceId: details.instanceId,
                url,
                state: State.Pending,
                hosting: approach,
                channel: channel ?? null,
                instanceTitle: details.instanceTitle,
                channelSockets: []
            })

            if (channel) {
                this.notifyUserChannelsChanged(details.instanceId, channel)
            }

            return details.instanceId
        }

        throw new Error(OpenError.AppNotFound)
    }

    setInstanceDetails(uuid: InstanceID, details: SailData): void {
        if (uuid != details.instanceId) {
            console.error("UUID mismatch", uuid, details.instanceId)
        }

        this.instances = this.instances.filter(ca => ca.instanceId !== uuid)
        this.instances.push(details)
    }

    getInstanceDetails(uuid: InstanceID): SailData | undefined {
        return this.instances.find(ca => ca.instanceId === uuid)
    }

    async setInitialChannel(app: AppIdentifier): Promise<void> {
        this.socket.emit(SAIL_CHANNEL_SETUP, app.instanceId)
    }

    async getConnectedApps(): Promise<AppRegistration[]> {
        return (await this.getAllApps()).filter(ca => ca.state == State.Connected)
    }

    async isAppConnected(app: InstanceID): Promise<boolean> {
        const found = (await this.getAllApps()).find(a => (a.instanceId == app) && (a.state == State.Connected))
        return found != null
    }

    async setAppState(app: InstanceID, state: State): Promise<void> {
        const found = this.instances.find(a => (a.instanceId == app))
        if (found) {
            const needsInitialChannelSetup = (found.state == State.Pending) && (state == State.Connected)
            found.state = state
            if (needsInitialChannelSetup) {
                this.setInitialChannel(found)
            }

            if (state == State.Terminated) {
                this.instances = this.instances.filter(a => (a.instanceId !== app))
                this.fdc3Server?.cleanup(found.instanceId)
            }
        }
    }


    async getAllApps(): Promise<AppRegistration[]> {
        return this.instances.map(x => {
            return {
                appId: x.appId,
                instanceId: x.instanceId,
                state: x.state
            }
        })
    }

    createUUID(): string {
        return uuidv4()
    }

    log(message: string): void {
        console.log('SAIL:' + message)
    }

    provider(): string {
        return "FDC3 Sail"
    }

    providerVersion(): string {
        return "2.0"
    }

    fdc3Version(): string {
        return "2.0"
    }

    convertToTabDetail(channel: ChannelState): TabDetail {
        return {
            id: channel.id,
            icon: channel.displayMetadata?.glyph ?? "",
            background: channel.displayMetadata?.color ?? ""
        }
    }

    augmentIntents(appIntents: AppIntent[]): AugmentedAppIntent[] {
        return appIntents.map(a => ({
            intent: a.intent,
            apps: a.apps.map((a) => {
                const dir = this.directory.retrieveAppsById(a.appId)
                const iconSrc = getIcon(dir[0])
                const title = dir.length > 0 ? dir[0]?.title : "Unknown App"

                if (a.instanceId) {
                    const instance = this.getInstanceDetails(a.instanceId)
                    const channel = this.getChannelDetails().find(c => c.id == instance?.channel)
                    return {
                        ...a,
                        channelData: channel ? this.convertToTabDetail(channel) : null,
                        instanceTitle: instance?.instanceTitle ?? undefined,
                        icons: [{ src: iconSrc }],
                        title
                    } as AugmentedAppMetadata
                } else {
                    return {
                        ...a,
                        icons: [{ src: iconSrc }],
                        title
                    } as AugmentedAppMetadata
                }
            })
        }))
    }

    /**
     * This is used when the intent resolver is managed by the desktop agent as opposed
     * to running inside an iframe in the client app.
     */
    async narrowIntents(raiser: AppIdentifier, incomingIntents: AppIntent[], context: Context): Promise<AppIntent[]> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const sc = this

        function runningAppsInChannel(arg0: AugmentedAppIntent, channel: string | null): number {
            return arg0.apps.filter(a => a.instanceId && a.channelData?.id == channel).length
        }

        function uniqueApps(arg0: AppIntent): number {
            return arg0.apps.map(a => a.appId).filter((value, index, self) => self.indexOf(value) === index).length
        }

        function isRunningInTab(arg0: AppIdentifier): boolean {
            const details = sc.getInstanceDetails(arg0.instanceId!)
            return details?.hosting == AppHosting.Tab
        }

        function raiserChannel(arg0: AppIdentifier): string | null {
            const details = sc.getInstanceDetails(arg0.instanceId!)
            return details?.channel ?? null
        }

        const augmentedIntents = this.augmentIntents(incomingIntents)

        if (isRunningInTab(raiser)) {
            // in this case, the tab needs the intent resolver
            return augmentedIntents
        }

        if (augmentedIntents.length == 0) {
            return augmentedIntents
        }

        if ((augmentedIntents.length == 1) && (uniqueApps(augmentedIntents[0]) == 1)) {
            const channel = raiserChannel(raiser)
            const runners = runningAppsInChannel(augmentedIntents[0], channel)
            if (runners == 0) {
                // we start a new app
                this.appStartDestinations.set(augmentedIntents[0].apps[0].appId, channel)
                return augmentedIntents
            } else if (runners == 1) {
                // we raise in the existing app
                return augmentedIntents
            }
        }

        return new Promise<AppIntent[]>((resolve) => {
            console.log("SAIL Narrowing intents", augmentedIntents, context)

            this.socket.emit(SAIL_INTENT_RESOLVE, {
                appIntents: augmentedIntents,
                context
            }, async (response: SailIntentResolveResponse, err: string) => {
                if (err) {
                    console.error(err)
                    resolve([])
                } else {
                    console.log("SAIL Narrowed intents", response)

                    if (appNeedsStarting(response.appIntents)) {
                        // tell sail where to open the app
                        const theAppIntent = getSingleAppIntent(response.appIntents)
                        const theApp = theAppIntent.apps[0]
                        this.appStartDestinations.set(theApp.appId, response.channel)
                    }

                    resolve(response.appIntents)
                }
            })
        })
    }

    async notifyUserChannelsChanged(instanceId: string, channelId: string | null): Promise<void> {
        console.log("SAIL User channels changed", instanceId, channelId)
        const instance = this.getInstanceDetails(instanceId!)
        if (instance) {
            instance.channel = channelId
            const channelChangeEvent: ChannelChangedEvent = {
                type: 'channelChangedEvent',
                payload: {
                    newChannelId: channelId,
                },
                meta: {
                    eventUuid: uuidv4(),
                    timestamp: new Date()
                }
            }
            this.post(channelChangeEvent, instanceId)
        }
    }

    async reloadAppDirectories(urls: string[], customApps: DirectoryApp[]) {
        await this.directory.replace(urls)
        customApps.forEach(a => this.directory.add(a))
    }

    private getChannelDetails(): ChannelState[] {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return ((this.fdc3Server as any).handlers[0].state as ChannelState[])
    }

    getTabs(): TabDetail[] {
        return this.getChannelDetails().map(c => this.convertToTabDetail(c))
    }

    updateChannelData(channelData: TabDetail[], history?: ContextHistory): void {

        function relevantHistory(id: string, history?: ContextHistory,): undefined | Context[] {
            if (history) {
                const basicHistory = history[id]
                // just the first item of each unique type
                const relevantHistory = basicHistory.filter((h, i, a) => a.findIndex(h2 => h2.type == h.type) == i)
                return relevantHistory
            }
            return undefined
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const channelState = ((this.fdc3Server as any).handlers[0].state as ChannelState[])
        channelState.length = 0;
        const newState = mapChannels(channelData).map(c => {
            return {
                ...c,
                context: relevantHistory(c.id, history) ?? channelState.find(cs => cs.id == c.id)?.context ?? []
            }
        })
        channelState.push(...newState)
        console.log("SAIL Updated channel data", channelState)
    }

}

function appNeedsStarting(appIntents: AppIntent[]) {
    return (appIntents.length == 1) && (appIntents[0].apps.length == 1) && (appIntents[0].apps[0].instanceId == null)
}

function getSingleAppIntent(appIntents: AppIntent[]) {
    return appIntents[0]
}
