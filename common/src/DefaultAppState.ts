import { AppState } from "./AppState"
import { AppHosting } from "./app-hosting"
import { DirectoryApp, WebAppDetails, State } from "@finos/fdc3-web-impl";
import { SailAppStateArgs } from "./message-types";
import { WebConnectionProtocol1Hello } from "@finos/fdc3-schema/dist/generated/api/BrowserTypes";
import { ServerState } from "./ServerState";
import { ClientState } from "./ClientState";

export class DefaultAppState implements AppState {

    windowInformation: Map<Window, string> = new Map()
    states: SailAppStateArgs = []
    callbacks: (() => void)[] = []
    cs: ClientState | null = null
    ss: ServerState | null = null

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
        const applications: DirectoryApp[] = await this.ss!!.getApplications()
        const firstMatchingApp = applications.find(x => {
            const d = x.details as WebAppDetails
            return (d.url == strippedIdentityUrl) ||
                (d.url == identityUrl) ||
                ((d.url.startsWith("/")) && identityUrl.endsWith(d.url))    // allows for local urls
        })
        return firstMatchingApp
    }

    init(ss: ServerState, cs: ClientState): void {
        this.cs = cs;
        this.ss = ss;
        // sets up postMessage listener for new applications joining

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

    createTitle(detail: DirectoryApp): string {
        const number = this.states.filter(p => p.appId != detail.appId).length + 1
        return `${detail.title} ${number}`
    }

    /**
     * Opens either a new panel or a browser tab for the application to go in, 
     * returns the instance id for the new thing.
     */
    open(detail: DirectoryApp, destination?: AppHosting): Promise<string> {
        return new Promise(async (resolve, _reject) => {
            const hosting: AppHosting = destination ?? (detail.hostManifests as any)?.sail?.forceNewWindow ? AppHosting.Tab : AppHosting.Frame
            const instanceId = await this.ss!!.registerAppLaunch(detail.appId, hosting)
            if (hosting == AppHosting.Tab) {
                const w = window.open((detail.details as WebAppDetails).url, "_blank")!!;
                this.registerAppWindow(w, instanceId)
                return resolve(instanceId)
            } else {
                this.cs!!.newPanel(detail, instanceId, this.createTitle(detail))
            }
        })
    }
}
