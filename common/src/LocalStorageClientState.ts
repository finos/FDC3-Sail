import { v4 as uuidv4 } from 'uuid';
import { getServerState } from "./ServerState";
import { AppPanel, ClientState } from "./ClientState";
import { AbstractClientState } from "./AbstractClientState";
import { Directory, TabDetail } from "./message-types";

const STORAGE_KEY = "sail-client-state"

class LocalStorageClientState extends AbstractClientState {

    constructor() {
        const theState = localStorage.getItem(STORAGE_KEY)
        if (theState) {
            const { tabs, panels, activeTabId, userSessionId, directories } = JSON.parse(theState)
            super(tabs, panels, activeTabId, userSessionId, directories)
        } else {
            super(DEFAULT_TABS, DEFAULT_PANELS, DEFAULT_TABS[0].id, "user-" + uuidv4(), DEFAULT_DIRECTORIES)
        }
    }

    saveState(): void {
        const data = JSON.stringify({ tabs: this.tabs, panels: this.panels, activeTabId: this.activeTabId, userSessionId: this.userSessionId, directories: this.directories })
        localStorage.setItem(STORAGE_KEY, data)
        this.callbacks.forEach(cb => cb())
        getServerState().sendClientState(this.tabs, this.directories)
    }

}

const DEFAULT_DIRECTORIES: Directory[] = [
    {
        label: "FDC3 Demo Apps",
        url: "../directory/appd.json",
        active: false
    },
    {
        label: "FDC3 Conformance",
        url: "./directory/local-conformance-2_0.v2.json",
        active: false
    },
    {
        label: "FINOS FDC3 Directory",
        url: "https://directory.fdc3.finos.org/v2/apps/",
        active: false
    },
    {
        label: "Sail Built-In Apps",
        url: "../directory/sail.json",
        active: true
    },
    {
        label: "Developer Tutorial",
        url: "../directory/training-appd.v2.json",
        active: true
    }
]


const DEFAULT_TABS: TabDetail[] = [
    {
        title: "One",
        id: "one",
        icon: "/static/icons/tabs/one.svg",
        background: '#123456',
    },
    {
        title: "Two",
        id: "two",
        icon: "/static/icons/tabs/two.svg",
        background: '#564312',
    },
    {
        title: "Three",
        id: "three",
        icon: "/static/icons/tabs/three.svg",
        background: '#125634',
    }
]

const DEFAULT_PANELS: AppPanel[] = [
]

const theState = new LocalStorageClientState()

export function getClientState(): ClientState {
    return theState
}