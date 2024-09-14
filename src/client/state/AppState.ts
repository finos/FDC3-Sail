import { WebConnectionProtocol1Hello } from "@kite9/fdc3-common";
import { getClientState } from "./clientState"
import { getServerState } from "./ServerState"
import { DirectoryApp } from "@kite9/fdc3-web-impl";
import { v4 as uuid } from 'uuid'

interface AppState {

    registerAppWindow(window: Window, instanceId: string): void

    open(detail: DirectoryApp): Promise<string>
}


class DefaultAppState implements AppState {

    windowInformation: Map<Window, string> = new Map()



    async getDirectoryAppForUrl(identityUrl: string): DirectoryApp {
        const strippedIdentityUrl = identityUrl.replace(/\/$/, "")
        const applications: DirectoryApp[] = await getServerState().getApplications()
        const firstMatchingApp = applications.find(x => (x.details.url == strippedIdentityUrl) || (x.details.url == identityUrl))
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

                const appD: DirectoryApp = await this.getDirectoryAppForUrl(helloData.payload.identityUrl)
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
        return new Promise((resolve, _reject) => {
            const openAsTab = detail.hostManifests?.sail?.forceNewWindow ?? false
            const instanceId = 'app-' + uuid()
            if (openAsTab) {
                const w = window.open(detail.details.url, "_blank")!!;
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