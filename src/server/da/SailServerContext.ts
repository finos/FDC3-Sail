import { Socket } from "socket.io";
import { v4 as uuidv4 } from 'uuid'
import { FDC3_DA_EVENT, SAIL_APP_OPEN, SAIL_CHANNEL_CHANGE, SAIL_INTENT_RESOLVE, SailAppOpenArgs } from "./message-types";
import { DirectoryApp, InstanceID, ServerContext } from "@kite9/fdc3-web-impl"
import { AppIdentifier } from "@kite9/fdc3";
import { SailDirectory } from "../appd/SailDirectory";
import { AppIntent, Context, OpenError } from "@kite9/fdc3";
import { OPEN } from "ws";

export enum State { Pending, Open, Closed }

export type SailData = AppIdentifier & {
    socket?: Socket,
    state: State,
    url?: string
}

export class SailServerContext implements ServerContext<SailData> {

    private instances: SailData[] = []
    readonly directory: SailDirectory
    private readonly socket: Socket

    constructor(directory: SailDirectory, socket: Socket) {
        this.directory = directory
        this.socket = socket
    }

    post(message: object, instanceId: InstanceID): Promise<void> {
        const instance = this.instances.find(i => i.instanceId == instanceId)
        if (instance) {
            instance.socket?.emit(FDC3_DA_EVENT, message)
        } else {
            this.log(`Can't find app: ${JSON.stringify(instanceId)}`)
        }
        return Promise.resolve()
    }


    async open(appId: string): Promise<InstanceID> {
        const app: DirectoryApp[] = this.directory.retrieveAppsById(appId) as DirectoryApp[]
        const url = (app[0].details as any)?.url ?? undefined
        if (url) {
            const instanceId = await this.socket.emitWithAck(SAIL_APP_OPEN, {
                appDRecord: app[0]
            } as SailAppOpenArgs)
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

    async setAppConnected(app: AppIdentifier): Promise<void> {
        this.instances.find(ca => (ca.instanceId == app.instanceId))!!.state = OPEN
    }

    async getConnectedApps(): Promise<AppIdentifier[]> {
        return this.instances
            .filter(ca => ca.state == OPEN)
            .map(a => {
                return {
                    appId: a.appId,
                    instanceId: a.instanceId
                }
            })
    }

    async isAppConnected(app: AppIdentifier): Promise<boolean> {
        const found = this.instances.find(a => (a.appId == app.appId) && (a.instanceId == app.instanceId) && (a.state == OPEN))
        return found != null
    }

    async disconnect(instanceId: InstanceID): Promise<void> {
        this.instances = this.instances.filter(ca => ca.instanceId !== instanceId)
    }

    createUUID(): string {
        return uuidv4()
    }

    log(message: string): void {
        console.log(message)
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

    async narrowIntents(appIntents: AppIntent[], context: Context): Promise<AppIntent[]> {
        function runningApps(arg0: AppIntent): number {
            return arg0.apps.filter(a => a.instanceId).length
        }

        function uniqueApps(arg0: AppIntent): number {
            return arg0.apps.map(a => a.appId).filter((value, index, self) => self.indexOf(value) === index).length
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
            console.log("Narrowing intents", appIntents, context)
            this.socket.emit(SAIL_INTENT_RESOLVE, {
                appIntents,
                context
            }, (response: AppIntent[], err: string) => {
                if (err) {
                    console.error(err)
                    resolve([])
                } else {
                    console.log("Narrowed intents", response)
                    resolve(response)
                }
            })
        })
    }

    userChannelChanged(app: AppIdentifier, channelId: string | null): void {
        console.log("User channel changed", app, channelId)
        this.socket.emit(SAIL_CHANNEL_CHANGE, app, channelId)
    }


}
