import { AppPanel, ClientState } from "./clientState"
import { getServerState } from "./serverConnectivity"


type WindowInformation = {
    window: Window
    panel: AppPanel
}

export function getWindowInformation(cs: ClientState): WindowInformation[] {
    const out = cs.getPanels().map(t => {
        const iframe = document.getElementById(`iframe_${t.id}`) as HTMLIFrameElement
        return { window: iframe.contentWindow!!, panel: t }
    })
    return out
}


export function setupPostMessage(cs: ClientState) {

    getServerState().registerDesktopAgent(cs.createArgs())

    window.addEventListener("message", (e) => {
        const event = e as MessageEvent
        const data = event.data;
        const source = event.source as Window
        const origin = event.origin;

        console.log("Received: " + JSON.stringify(event.data));
        if (data.type == "WCP1Hello") {
            const windowInfo = getWindowInformation(cs)
            const instance = windowInfo.find(x => x.window == source)
            if (instance) {
                source.postMessage({
                    type: "WCP2LoadUrl",
                    meta: {
                        connectionAttemptUuid: data.meta.connectionAttemptUuid,
                        timestamp: new Date()
                    },
                    payload: {
                        iframeUrl: window.location.origin + `/static/embed.html?connectionAttemptUuid=${data.meta.connectionAttemptUuid}&desktopAgentId=${cs.getUserSessionID()}&instanceId=${instance.panel.id}&appId=${instance.panel.appId}`
                    }
                }, origin)
            }
        }
    });
}