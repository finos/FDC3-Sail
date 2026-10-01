import { v4 as uuidv4 } from "uuid"
import { AppPanel } from "./ClientState"
import { AbstractClientState } from "./AbstractClientState"
import { Directory, TabDetail, WscpPairing } from "./message-types"
import { ServerState } from "./ServerState"

const STORAGE_KEY = "sail-client-state"

export class LocalStorageClientState extends AbstractClientState {
  ss: ServerState | null = null

  constructor() {
    const theState = localStorage.getItem(STORAGE_KEY)
    if (theState) {
      const {
        tabs,
        panels,
        activeTabId,
        userSessionId,
        splashScreenVisible,
        directories,
        knownApps,
        customApps,
        contextHistory,
        wscpPairings,
      } = JSON.parse(theState)
      super(
        tabs,
        panels,
        activeTabId,
        userSessionId,
        splashScreenVisible ?? true,
        directories ?? [],
        knownApps ?? [],
        customApps ?? [],
        contextHistory ?? {},
        (wscpPairings as WscpPairing[] | undefined) ?? [],
      )
    } else {
      super(
        DEFAULT_TABS,
        DEFAULT_PANELS,
        DEFAULT_TABS[0].id,
        "user-" + uuidv4(),
        true,
        DEFAULT_DIRECTORIES,
        [],
        [],
        {},
        [],
      )
    }
  }

  init(ss: ServerState): void {
    if (this.ss == null) {
      this.ss = ss
    }
  }

  async saveState(): Promise<void> {
    const data = JSON.stringify({
      tabs: this.tabs,
      panels: this.panels,
      activeTabId: this.activeTabId,
      userSessionId: this.userSessionId,
      splashScreenVisible: this.splashScreenVisible,
      directories: this.directories,
      knownApps: this.knownApps,
      customApps: this.customApps,
      contextHistory: this.contextHistory,
      wscpPairings: this.wscpPairings,
    })
    localStorage.setItem(STORAGE_KEY, data)
    this.callbacks.forEach((cb) => cb())
    await this.ss!.sendClientState(this.createArgs())
  }
}

const DEFAULT_DIRECTORIES: Directory[] = [
  {
    label: "FINOS FDC3 Directory",
    url: "https://directory.fdc3.finos.org/v2/apps/",
    active: true,
  },
  {
    label: "FDC3 Example Apps (local)",
    url: "http://localhost:4005/static/generated/fdc3-example-apps.json",
    active: false,
  },
]

const DEFAULT_TABS: TabDetail[] = [
  {
    id: "One",
    icon: "/icons/tabs/one.svg",
    background: "#123456",
  },
  {
    id: "Two",
    icon: "/icons/tabs/two.svg",
    background: "#564312",
  },
  {
    id: "Three",
    icon: "/icons/tabs/three.svg",
    background: "#125634",
  },
]

const DEFAULT_PANELS: AppPanel[] = []
