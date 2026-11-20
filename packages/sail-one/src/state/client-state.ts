import type { GridStackPosition } from "gridstack"
import {
  createLocalUserStorage,
  type LocalUserStorageOptions,
  type SailApp,
  type SailUserStorage,
  type SailWebApp,
} from "@finos/sail-platform"

export type TabDetail = {
  id: string
  icon: string
  background: string
}

export type AppPanel = GridStackPosition & {
  title: string
  url: string
  tabId: string
  panelId: string
  appId: string
  icon: string | null
}

export interface ClientState {
  /**
   * Hydrate from platform storage. Must be awaited before the shell renders —
   * the platform storage API is async, unlike the localStorage reads it replaces.
   */
  load(): Promise<void>
  getUserSessionID(): string
  getActiveTab(): TabDetail
  setActiveTabId(n: string): Promise<void>
  getTabs(): TabDetail[]
  addTab(td: TabDetail): Promise<void>
  removeTab(id: string): Promise<void>
  updateTab(td: TabDetail): Promise<void>
  renameTab(oldId: string, newId: string): Promise<void>
  moveTab(id: string, delta: "up" | "down"): Promise<void>
  reorderTab(fromId: string, toId: string, place?: "before" | "after"): Promise<void>
  updatePanel(ap: AppPanel): Promise<void>
  removePanel(id: string): Promise<void>
  getPanels(): AppPanel[]
  newPanel(detail: SailApp, instanceId: string, title: string): AppPanel
  addStateChangeCallback(cb: () => void): void
}

type PersistedClientState = {
  tabs: TabDetail[]
  panels: AppPanel[]
  activeTabId: string
  userSessionId: string
}

const STORAGE_CONFIG: LocalUserStorageOptions = {
  keyPrefix: "sail_one_",
}

/** Key this shell's state lives under, giving `sail_one_config` as before. */
const STATE_KEY = "config"

const DEFAULT_TABS: TabDetail[] = [
  {
    id: "One",
    icon: "/icons/tabs/noun-airplane-3707662.svg",
    background: "#0061F2",
  },
  {
    id: "Two",
    icon: "/icons/tabs/noun-camera-3707659.svg",
    background: "#FF5A1F",
  },
  {
    id: "Three",
    icon: "/icons/tabs/noun-console-3707664.svg",
    background: "#00A86B",
  },
]

/** Refresh legacy defaults so existing sessions pick up the brighter palette. */
const LEGACY_TAB_BACKGROUNDS: Record<string, string> = {
  "#123456": "#0061F2",
  "#564312": "#FF5A1F",
  "#125634": "#00A86B",
  "#1f6feb": "#0061F2",
  "#e67e22": "#FF5A1F",
  "#1abc9c": "#00A86B",
}

/** Number glyphs were position-looking defaults, not titles — migrate away. */
const LEGACY_TAB_ICONS: Record<string, string> = {
  "/icons/tabs/one.svg": "/icons/tabs/noun-airplane-3707662.svg",
  "/icons/tabs/two.svg": "/icons/tabs/noun-camera-3707659.svg",
  "/icons/tabs/three.svg": "/icons/tabs/noun-console-3707664.svg",
}

function migrateTabColors(tabs: TabDetail[]): TabDetail[] {
  return tabs.map(tab => {
    const nextBg = LEGACY_TAB_BACKGROUNDS[tab.background.toLowerCase()]
    const nextIcon = LEGACY_TAB_ICONS[tab.icon]
    return {
      ...tab,
      background: nextBg ?? tab.background,
      icon: nextIcon ?? tab.icon,
    }
  })
}

function appUrl(detail: SailApp): string | undefined {
  const url = (detail as SailWebApp).url
  return typeof url === "string" && url.length > 0 ? url : undefined
}

export class PlatformClientState implements ClientState {
  private tabs: TabDetail[] = DEFAULT_TABS
  private panels: AppPanel[] = []
  private activeTabId: string = DEFAULT_TABS[0]!.id
  private userSessionId = "user-" + crypto.randomUUID()
  private callbacks: (() => void)[] = []
  private readonly storage: SailUserStorage

  constructor(storage: SailUserStorage = createLocalUserStorage(STORAGE_CONFIG)) {
    this.storage = storage
  }

  async load(): Promise<void> {
    const stored = await this.storage.get<Partial<PersistedClientState>>(STATE_KEY)

    if (!stored?.tabs || stored.tabs.length === 0) {
      await this.saveState()
      return
    }

    const migratedTabs = migrateTabColors(stored.tabs)
    this.tabs = migratedTabs
    this.panels = stored.panels ?? []
    this.activeTabId = stored.activeTabId ?? migratedTabs[0]!.id
    this.userSessionId = stored.userSessionId ?? this.userSessionId

    if (JSON.stringify(migratedTabs) !== JSON.stringify(stored.tabs)) {
      await this.saveState()
    }
  }

  private async saveState(): Promise<void> {
    const data: PersistedClientState = {
      tabs: this.tabs,
      panels: this.panels,
      activeTabId: this.activeTabId,
      userSessionId: this.userSessionId,
    }
    await this.storage.set(STATE_KEY, data)
    this.callbacks.forEach(cb => cb())
  }

  getActiveTab(): TabDetail {
    const out = this.tabs.find(t => t.id == this.activeTabId)
    if (!out) {
      this.activeTabId = this.tabs[0]!.id
      this.saveState().catch(() => {
        console.error("Error saving state")
      })
      return this.tabs[0]!
    }
    return out
  }

  async setActiveTabId(n: string): Promise<void> {
    this.activeTabId = n
    await this.saveState()
  }

  getTabs(): TabDetail[] {
    return this.tabs
  }

  async addTab(td: TabDetail): Promise<void> {
    this.tabs.push(td)
    await this.saveState()
  }

  async removeTab(id: string): Promise<void> {
    if (this.tabs.length <= 1) {
      return
    }
    this.tabs = this.tabs.filter(t => t.id != id)
    this.panels = this.panels.filter(p => p.tabId != id)
    if (this.activeTabId === id) {
      this.activeTabId = this.tabs[0]!.id
    }
    await this.saveState()
  }

  async updateTab(td: TabDetail): Promise<void> {
    const idx = this.tabs.findIndex(t => t.id == td.id)
    if (idx != -1) {
      this.tabs[idx] = td
      await this.saveState()
    }
  }

  async renameTab(oldId: string, newId: string): Promise<void> {
    if (oldId === newId) {
      return
    }
    if (this.tabs.some(t => t.id === newId)) {
      throw new Error(`Tab id already exists: ${newId}`)
    }
    const idx = this.tabs.findIndex(t => t.id == oldId)
    if (idx < 0) {
      return
    }
    this.tabs[idx] = { ...this.tabs[idx]!, id: newId }
    this.panels = this.panels.map(p => (p.tabId === oldId ? { ...p, tabId: newId } : p))
    if (this.activeTabId === oldId) {
      this.activeTabId = newId
    }
    await this.saveState()
  }

  async moveTab(id: string, delta: "up" | "down"): Promise<void> {
    const idx = this.tabs.findIndex(t => t.id == id)
    if (idx < 0) {
      return
    }
    const swapWith = delta === "up" ? idx - 1 : idx + 1
    if (swapWith < 0 || swapWith >= this.tabs.length) {
      return
    }
    const tmp = this.tabs[idx]!
    this.tabs[idx] = this.tabs[swapWith]!
    this.tabs[swapWith] = tmp
    await this.saveState()
  }

  async reorderTab(
    fromId: string,
    toId: string,
    place: "before" | "after" = "before",
  ): Promise<void> {
    if (fromId === toId) {
      return
    }
    const fromIdx = this.tabs.findIndex(t => t.id == fromId)
    if (fromIdx < 0 || this.tabs.findIndex(t => t.id == toId) < 0) {
      return
    }
    const [moved] = this.tabs.splice(fromIdx, 1)
    const toIdx = this.tabs.findIndex(t => t.id == toId)
    if (toIdx < 0) {
      this.tabs.splice(fromIdx, 0, moved!)
      return
    }
    const insertIdx = place === "before" ? toIdx : toIdx + 1
    this.tabs.splice(insertIdx, 0, moved!)
    await this.saveState()
  }

  async updatePanel(ap: AppPanel): Promise<void> {
    const idx = this.panels.findIndex(p => p.panelId == ap.panelId)
    if (idx != -1) {
      this.panels[idx] = ap
    } else {
      this.panels.push(ap)
    }
    await this.saveState()
  }

  async removePanel(id: string): Promise<void> {
    this.panels = this.panels.filter(p => p.panelId != id)
    await this.saveState()
  }

  newPanel(detail: SailApp, instanceId: string, title: string): AppPanel {
    const url = appUrl(detail)
    if (!url) {
      throw new Error(`App ${detail.appId} has no URL`)
    }

    const ap: AppPanel = {
      x: -1,
      y: -1,
      w: 6,
      h: 8,
      title,
      tabId: this.activeTabId,
      panelId: instanceId,
      url,
      appId: detail.appId,
      icon: detail.icon ?? null,
    }

    this.panels.push(ap)
    this.saveState().catch((e: unknown) => {
      console.error("Error saving state", e)
    })
    return ap
  }

  getPanels(): AppPanel[] {
    return this.panels
  }

  addStateChangeCallback(cb: () => void) {
    this.callbacks.push(cb)
  }

  getUserSessionID(): string {
    return this.userSessionId
  }
}
