import { Socket } from "socket.io";
import { v4 as uuidv4 } from 'uuid'
import { AppRegistration, DirectoryApp, FDC3Server, InstanceID, ServerContext, State } from "@finos/fdc3-web-impl"
import { AppIdentifier } from "@finos/fdc3";
import { getIcon, SailDirectory } from "../appd/SailDirectory";
import { AppIntent, Context, OpenError } from "@finos/fdc3";
import { FDC3_DA_EVENT, SAIL_APP_OPEN, SAIL_CHANNEL_CHANGE, SAIL_CHANNEL_SETUP, SAIL_INTENT_RESOLVE, SailAppOpenArgs, AppHosting, Directory, SailIntentResolveResponse, AugmentedAppIntent, AugmentedAppMetadata, SailAppOpenResponse } from "@finos/fdc3-sail-common";


/**
 * Represents the state of a Sail app.
 * Pending: App has a window, but isn't connected to FDC3
 * Open: App is connected to FDC3
 * NotResponding: App is not responding to heartbeats
 * Terminated: App Window has been closed
 */
export type SailData = AppRegistration & {
    socket?: Socket,
    url?: string,
    hosting: AppHosting,
    channel: string | null,
    instanceTitle: string
}

export class SailServerContext implements ServerContext<SailData> {

    private instances: SailData[] = []
    readonly directory: SailDirectory
    private readonly socket: Socket
    private fdc3Server: FDC3Server | undefined

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
            if (!(message as any)?.type?.startsWith("heartbeat")) {
                this.log("Posting message to app: " + JSON.stringify(message))
            }
            instance.socket?.emit(FDC3_DA_EVENT, message)
        } else {
            this.log(`Can't find app: ${JSON.stringify(instanceId)}`)
        }
        return Promise.resolve()
    }

    async open(appId: string): Promise<InstanceID> {
        return this.openSail(appId, undefined)
    }

    async openSail(appId: string, channel: string | null | undefined): Promise<InstanceID> {
        const app: DirectoryApp[] = this.directory.retrieveAppsById(appId) as DirectoryApp[]

        if (app.length == 0) {
            throw new Error(OpenError.AppNotFound)
        }

        const url = (app[0].details as any)?.url ?? undefined
        if (url) {
            const forceNewWindow = (app[0].hostManifests as any)?.sail?.forceNewWindow
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
                instanceTitle: details.instanceTitle
            })

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

    augmentIntents(appIntents: AppIntent[]): AugmentedAppIntent[] {
        return appIntents.map(a => ({
            intent: a.intent,
            apps: a.apps.map((a) => {
                const dir = this.directory.retrieveAppsById(a.appId)
                const icon = getIcon(dir[0])
                const title = dir.length > 0 ? dir[0]?.title : "Unknown App"

                if (a.instanceId) {
                    const instance = this.getInstanceDetails(a.instanceId)
                    return {
                        ...a,
                        channel: instance?.channel ?? null,
                        instanceTitle: instance?.instanceTitle ?? undefined,
                        icon,
                        title
                    } as AugmentedAppMetadata
                } else {
                    return {
                        ...a,
                        icon,
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
        const sc = this

        function runningApps(arg0: AppIntent): number {
            return arg0.apps.filter(a => a.instanceId).length
        }

        function uniqueApps(arg0: AppIntent): number {
            return arg0.apps.map(a => a.appId).filter((value, index, self) => self.indexOf(value) === index).length
        }

        function isRunningInTab(arg0: AppIdentifier): boolean {
            const details = sc.getInstanceDetails(arg0.instanceId!!)
            return details?.hosting == AppHosting.Tab
        }

        const augmentedIntents = this.augmentIntents(incomingIntents)

        if (isRunningInTab(raiser)) {
            // in this case, the tab needs the intent resolver
            return augmentedIntents
        }

        if (augmentedIntents.length == 0) {
            return augmentedIntents
        }

        if (augmentedIntents.length == 1) {
            if ((uniqueApps(augmentedIntents[0]) == 1) && (runningApps(augmentedIntents[0]) <= 1)) {
                return augmentedIntents
            }
        }

        return new Promise<AppIntent[]>((resolve, _reject) => {
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
                        // this overrides the fdc3-for-web-impl default behavior in order
                        // that we can open the app in the right tab
                        const theAppIntent = getSingleAppIntent(response.appIntents)
                        const theApp = theAppIntent.apps[0]
                        const instanceId = await this.openSail(theApp.appId, response.channel)
                        const out: AppIntent[] = [
                            {
                                intent: theAppIntent.intent,
                                apps: [{
                                    appId: theApp.appId,
                                    instanceId
                                }]
                            }
                        ]
                        resolve(out)
                    } else {
                        resolve(response.appIntents)
                    }
                }
            })
        })
    }

    async userChannelChanged(app: AppIdentifier, channelId: string | null): Promise<void> {
        console.log("SAIL User channel changed", app, channelId)
        const instance = this.getInstanceDetails(app.instanceId!!)
        if (instance) {
            instance.channel = channelId
        }
        await this.socket.emitWithAck(SAIL_CHANNEL_CHANGE, app, channelId)
    }

    async reloadAppDirectories(d: Directory[]) {
        const toLoad = d.filter(d => d.active).map(d => d.url)
        await this.directory.replace(toLoad)
    }

}

function appNeedsStarting(appIntents: AppIntent[]) {
    return (appIntents.length == 1) && (appIntents[0].apps.length == 1) && (appIntents[0].apps[0].instanceId == null)
}

function getSingleAppIntent(appIntents: AppIntent[]) {
    return appIntents[0]
}
