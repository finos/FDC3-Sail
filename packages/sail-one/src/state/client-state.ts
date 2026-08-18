import type { GridStackPosition } from "gridstack"
import {
  createLocalStorage,
  type LocalStorageOptions,
  type SailStorage,
} from "@finos/sail-platform"
import type { DirectoryApp, WebAppDetails } from "@finos/sail-desktop-agent"
import type { IntentResolution } from "../resolver/types"

type ClientStateSyncTarget = {
  sendClientState(cs: SailClientStateArgs): Promise<void>
}

export type TabDetail = {
  id: string
  icon: string
  background: string
}

export type Directory = {
  label: string
  url: string
  active: boolean
}

export type SailClientStateArgs = {
  userSessionId: string
  directories: string[]
  channels: TabDetail[]
  panels: AppPanel[]
  customApps: DirectoryApp[]
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
  newPanel(detail: DirectoryApp, instanceId: string, title: string): AppPanel
  setDirectories(d: Directory[]): Promise<void>
  getDirectories(): Directory[]
  updateDirectory(din: Directory): Promise<void>
  setCustomApps(apps: DirectoryApp[]): Promise<void>
  getCustomApps(): DirectoryApp[]
  addStateChangeCallback(cb: () => void): void
  createArgs(): SailClientStateArgs
  getIntentResolution(): IntentResolution | null
  setIntentResolution(ir: IntentResolution | null): void
}

/**
 * Persisted shape of the shell's own state.
 *
 * Stored through a {@link SailStorage}, which wraps raw `localStorage`
 * reads/writes behind a small typed get/set surface.
 */
type PersistedClientState = {
  tabs: TabDetail[]
  panels: AppPanel[]
  activeTabId: string
  userSessionId: string
  directories: Directory[]
  customApps: DirectoryApp[]
}

const STORAGE_CONFIG: LocalStorageOptions = {
  keyPrefix: "sail_one_",
}

/** Key this shell's state lives under, giving `sail_one_config` as before. */
const STATE_KEY = "config"

const DEFAULT_DIRECTORIES: Directory[] = [
  {
    label: "FINOS FDC3 Directory",
    url: "https://directory.fdc3.finos.org/v2/apps",
    active: true,
  },
]

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

export class PlatformClientState implements ClientState {
  private tabs: TabDetail[] = DEFAULT_TABS
  private panels: AppPanel[] = []
  private activeTabId: string = DEFAULT_TABS[0]!.id
  private userSessionId = "user-" + crypto.randomUUID()
  private directories: Directory[] = DEFAULT_DIRECTORIES
  private callbacks: (() => void)[] = []
  private intentResolution: IntentResolution | null = null
  private customApps: DirectoryApp[] = []
  private ss: ClientStateSyncTarget | null = null
  private readonly storage: SailStorage

  constructor(storage: SailStorage = createLocalStorage(STORAGE_CONFIG)) {
    this.storage = storage
  }

  async load(): Promise<void> {
    const stored = await this.storage.get<Partial<PersistedClientState>>(STATE_KEY)

    if (!stored?.tabs || stored.tabs.length === 0) {
      // Nothing persisted yet — keep the constructor defaults and write them out
      // so the agent and the shell start from the same channel set.
      await this.saveState()
      return
    }

    const migratedTabs = migrateTabColors(stored.tabs)
    this.tabs = migratedTabs
    this.panels = stored.panels ?? []
    this.activeTabId = stored.activeTabId ?? migratedTabs[0]!.id
    this.userSessionId = stored.userSessionId ?? this.userSessionId
    this.directories = stored.directories ?? []
    this.customApps = stored.customApps ?? []

    if (JSON.stringify(migratedTabs) !== JSON.stringify(stored.tabs)) {
      await this.saveState()
    }
  }

  init(ss: ClientStateSyncTarget): void {
    if (this.ss == null) {
      this.ss = ss
    }
  }

  private async saveState(): Promise<void> {
    const data: PersistedClientState = {
      tabs: this.tabs,
      panels: this.panels,
      activeTabId: this.activeTabId,
      userSessionId: this.userSessionId,
      directories: this.directories,
      customApps: this.customApps,
    }
    await this.storage.set(STATE_KEY, data)
    this.callbacks.forEach(cb => cb())
    if (this.ss) {
      await this.ss.sendClientState(this.createArgs())
    }
  }

  getActiveTab(): TabDetail {
    const out = this.tabs.find(t => t.id == this.activeTabId)
    if (!out) {
      // removeTab() floors `tabs` to never go empty, but TypeScript cannot see
      // that invariant across the class.
      this.activeTabId = this.tabs[0]!.id
      this.saveState().catch(() => {
        console.error("Error saving state")
      })
      return this.tabs[0]!
    }
    return out
  }

  async setActiveTabId(id: string): Promise<void> {
    this.activeTabId = id
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
    const remaining = this.tabs.filter(t => t.id != id)
    if (remaining.length === 0) {
      // Never remove the last tab: nothing left to activate or render.
      return
    }
    this.tabs = remaining
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
    }
    await this.saveState()
  }

  async renameTab(oldId: string, newId: string): Promise<void> {
    const nextId = newId.trim()
    if (!nextId || nextId === oldId) {
      return
    }
    if (this.tabs.some(t => t.id === nextId)) {
      alert("A channel with that name already exists")
      return
    }
    const idx = this.tabs.findIndex(t => t.id == oldId)
    if (idx < 0) {
      return
    }
    this.tabs[idx] = { ...this.tabs[idx]!, id: nextId }
    this.panels = this.panels.map(p => (p.tabId === oldId ? { ...p, tabId: nextId } : p))
    if (this.activeTabId === oldId) {
      this.activeTabId = nextId
    }
    await this.saveState()
  }

  async moveTab(id: string, delta: "up" | "down"): Promise<void> {
    const idx = this.tabs.findIndex(t => t.id == id)
    if (idx != -1) {
      if (delta == "up" && idx > 0) {
        const temp = this.tabs[idx - 1]!
        this.tabs[idx - 1] = this.tabs[idx]!
        this.tabs[idx] = temp
      } else if (delta == "down" && idx < this.tabs.length - 1) {
        const temp = this.tabs[idx + 1]!
        this.tabs[idx + 1] = this.tabs[idx]!
        this.tabs[idx] = temp
      }
    }

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

  newPanel(detail: DirectoryApp, instanceId: string, title: string): AppPanel {
    if (detail.type == "web") {
      const url = (detail.details as WebAppDetails).url

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
        icon: detail.icons?.[0]?.src ?? null,
      }

      this.panels.push(ap)
      this.saveState().catch((e: unknown) => {
        console.error("Error saving state", e)
      })
      return ap
    }

    throw new Error("Unsupported app type: " + detail.type)
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

  async setDirectories(d: Directory[]): Promise<void> {
    this.directories = d
    await this.saveState()
  }

  getDirectories(): Directory[] {
    return this.directories
  }

  async updateDirectory(din: Directory) {
    const idx = this.directories.findIndex(d => d.url == din.url)
    if (idx > -1) {
      this.directories[idx] = din
    } else {
      this.directories.push(din)
    }

    await this.saveState()
  }

  createArgs(): SailClientStateArgs {
    return {
      userSessionId: this.userSessionId,
      directories: this.directories.filter(d => d.active).map(d => d.url),
      channels: this.tabs,
      panels: this.panels,
      customApps: this.customApps,
    }
  }

  getIntentResolution(): IntentResolution | null {
    return this.intentResolution
  }

  setIntentResolution(ir: IntentResolution | null): void {
    this.intentResolution = ir
    this.saveState().catch((e: unknown) => {
      console.error("Error saving state", e)
    })
  }

  async setCustomApps(apps: DirectoryApp[]): Promise<void> {
    this.customApps = apps
    await this.saveState()
  }

  getCustomApps(): DirectoryApp[] {
    return this.customApps
  }
}
