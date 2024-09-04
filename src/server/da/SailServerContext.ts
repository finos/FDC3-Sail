import { Socket } from "socket.io";
import { v4 as uuidv4 } from 'uuid'
import { FDC3_APP_EVENT, FDC3_DA_EVENT } from "./message-types";
import { DirectoryApp, InstanceID, ServerContext } from "@kite9/da-server"
import { AppIdentifier } from "@kite9/fdc3-common";
import { SailDirectory } from "../appd/SailDirectory";
import { AppIntent, Context, OpenError } from "@kite9/fdc3";
import { OPEN } from "ws";

export enum State { Pending, Open, Closed }

export type SailData = AppIdentifier & {
    socket?: Socket,
    url: string
    state: State
}

export class SailServerContext implements ServerContext<SailData> {

    private instances: SailData[] = []
    readonly directory: SailDirectory

    constructor(directory: SailDirectory) {
        this.directory = directory
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
            const instanceId: InstanceID = 'app-' + this.createUUID()
            const metadata = {
                appId,
                instanceId,
                state: State.Pending
            } as SailData

            this.setInstanceDetails(instanceId, metadata)
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

    async getConnectedApps(): Promise<SailData[]> {
        return this.instances.filter(ca => ca.state == OPEN)
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

    narrowIntents(appIntents: AppIntent[], context: Context): Promise<AppIntent[]> {
        throw new Error("Method not implemented.");
    }

}