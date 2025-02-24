import { Socket } from "socket.io";
import { v4 as uuidv4 } from 'uuid'
import { AppRegistration, DirectoryApp, FDC3Server, InstanceID, ServerContext, State } from "@finos/fdc3-web-impl"
import { AppIdentifier } from "@finos/fdc3";
import { SailDirectory } from "../appd/SailDirectory";
import { AppIntent, Context, OpenError } from "@finos/fdc3";
import { FDC3_DA_EVENT, SAIL_APP_OPEN, SAIL_CHANNEL_CHANGE, SAIL_CHANNEL_SETUP, SAIL_INTENT_RESOLVE, SailAppOpenArgs, AppHosting, Directory } from "@finos/fdc3-sail-common";


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
    hosting: AppHosting
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
        const app: DirectoryApp[] = this.directory.retrieveAppsById(appId) as DirectoryApp[]

        if (app.length == 0) {
            throw new Error(OpenError.AppNotFound)
        }

        const url = (app[0].details as any)?.url ?? undefined
        const hosting = (app[0].hostManifests as any)?.sail?.forceNewWindow ? AppHosting.Tab : AppHosting.Frame
        if (url) {
            const instanceId = await this.socket.emitWithAck(SAIL_APP_OPEN, {
                appDRecord: app[0]
            } as SailAppOpenArgs)
            this.setInstanceDetails(instanceId, {
                appId,
                instanceId,
                url,
                state: State.Pending,
                hosting
            })
            return instanceId
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



    async narrowIntents(raiser: AppIdentifier, appIntents: AppIntent[], context: Context): Promise<AppIntent[]> {
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

        if (isRunningInTab(raiser)) {
            // in this case, the tab needs the intent resolver
            return appIntents
        }

        if (appIntents.length == 0) {
            return appIntents
        }

        if (appIntents.length == 1) {
            if ((uniqueApps(appIntents[0]) == 1) && (runningApps(appIntents[0]) <= 1)) {
                return appIntents
            }
        }

        return new Promise<AppIntent[]>((resolve, _reject) => {
            console.log("SAIL Narrowing intents", appIntents, context)
            this.socket.emit(SAIL_INTENT_RESOLVE, {
                appIntents,
                context
            }, (response: AppIntent[], err: string) => {
                if (err) {
                    console.error(err)
                    resolve([])
                } else {
                    console.log("SAIL Narrowed intents", response)
                    resolve(response)
                }
            })
        })
    }

    userChannelChanged(app: AppIdentifier, channelId: string | null): void {
        console.log("SAIL User channel changed", app, channelId)
        this.socket.emit(SAIL_CHANNEL_CHANGE, app, channelId)
    }

    reloadAppDirectories(d: Directory[]) {
        const toLoad = d.filter(d => d.active).map(d => d.url)
        this.directory.replace(toLoad)
    }

}
