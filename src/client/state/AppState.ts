import { BrowserTypes } from "@kite9/fdc3";
import { getClientState } from "./ClientState"
import { getServerState } from "./ServerState"
import { DirectoryApp, WebAppDetails, State } from "@kite9/fdc3-web-impl";
import { SailAppStateArgs } from "../../server/da/message-types";
import { AppHosting } from "../../server/da/SailServerContext";

type WebConnectionProtocol1Hello = BrowserTypes.WebConnectionProtocol1Hello


export interface AppState {

    registerAppWindow(window: Window, instanceId: string): void

    open(detail: DirectoryApp): Promise<string>

    getAppState(instanceId: string): State | undefined

    setAppState(state: SailAppStateArgs): void

    addStateChangeCallback(cb: () => void): void

}


class DefaultAppState implements AppState {

    windowInformation: Map<Window, string> = new Map()
    states: SailAppStateArgs = []
    callbacks: (() => void)[] = []

    getAppState(instanceId: string): State | undefined {
        return this.states.find(x => x.instanceId == instanceId)?.state
    }

    setAppState(state: SailAppStateArgs): void {
        this.states = state
        this.callbacks.forEach(x => x())
    }

    addStateChangeCallback(cb: () => void): void {
        this.callbacks.push(cb)
    }


    async getDirectoryAppForUrl(identityUrl: string): Promise<DirectoryApp | undefined> {
        const strippedIdentityUrl = identityUrl.replace(/\/$/, "")
        const applications: DirectoryApp[] = await getServerState().getApplications()
        const firstMatchingApp = applications.find(x => {
            const d = x.details as WebAppDetails
            return (d.url == strippedIdentityUrl) ||
                (d.url == identityUrl) ||
                ((d.url.startsWith("/")) && identityUrl.endsWith(d.url))    // allows for local urls
        })
        return firstMatchingApp
    }

    init(): void {
        // sets up postMessage listener for new applications joining
        const cs = getClientState()

        window.addEventListener("message", async (e) => {
            const event = e as MessageEvent
            const data = event.data;
            const source = event.source as Window
            const origin = event.origin;

            console.log("Received: " + JSON.stringify(event.data));
            if (data.type == "WCP1Hello") {
                const helloData: WebConnectionProtocol1Hello = event.data

                const appD: DirectoryApp | undefined = await this.getDirectoryAppForUrl(helloData.payload.identityUrl)
                const appId = appD?.appId
                const instanceId = await this.getInstanceIdForWindow(source)

                if (appD && instanceId) {
                    source.postMessage({
                        type: "WCP2LoadUrl",
                        meta: {
                            connectionAttemptUuid: data.meta.connectionAttemptUuid,
                            timestamp: new Date()
                        },
                        payload: {
                            iframeUrl: window.location.origin + `/static/embed.html?connectionAttemptUuid=${data.meta.connectionAttemptUuid}&desktopAgentId=${cs.getUserSessionID()}&instanceId=${instanceId}&appId=${appId}`
                        }
                    }, origin)
                } else {
                    console.error("Illegal handshake attempt", JSON.stringify(helloData, null, 2), appD, instanceId)
                }
            }
        });
    }

    registerAppWindow(window: Window, instanceId: string): void {
        this.windowInformation.set(window, instanceId)
    }

    /**
     * Since sometimes it takes the app windows a little while to load, here 
     */
    async getInstanceIdForWindow(window: Window): Promise<string | undefined> {
        const me = this
        return new Promise<string | undefined>((resolve, _reject) => {

            const endTime = new Date().getTime() + 10000

            function retry() {
                const instanceId = me.windowInformation.get(window)
                if (instanceId) {
                    resolve(instanceId)
                } else {
                    if (new Date().getTime() > endTime) {
                        resolve(undefined)
                    } else {
                        setTimeout(retry, 200)
                    }
                }
            }

            retry()
        })
    }

    /**
     * Opens either a new panel or a browser tab for the application to go in, 
     * returns the instance id for the new thing.
     */
    open(detail: DirectoryApp): Promise<string> {
        return new Promise(async (resolve, _reject) => {
            const hosting: AppHosting = (detail.hostManifests as any)?.sail?.forceNewWindow ? AppHosting.Tab : AppHosting.Frame
            const instanceId = await getServerState().registerAppLaunch(detail.appId, hosting)
            if (hosting == AppHosting.Tab) {
                const w = window.open((detail.details as WebAppDetails).url, "_blank")!!;
                this.registerAppWindow(w, instanceId)
                return resolve(instanceId)
            } else {
                getClientState().newPanel(detail, instanceId)
            }
        })
    }
}

const theAppState = new DefaultAppState()

export function getAppState() {
    return theAppState
}