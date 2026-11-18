import { create } from "zustand"

export type QuickAccessPanelContent =
  | "app-directory"
  | "workspace-directory"
  | "extension-settings"
  | null

interface UIState {
  activeQuickAccessPanel: QuickAccessPanelContent
}

interface UIActions {
  setActiveQuickAccessPanel: (content: QuickAccessPanelContent) => void
  openAppDirectory: () => void
  openWorkspaceDirectory: () => void
  openExtensionSettings: () => void
  closeQuickAccessPanel: () => void
}

export interface UIStore extends UIState, UIActions {}

export const useUIStore = create<UIStore>(set => ({
  // Initial state
  activeQuickAccessPanel: null,

  // Actions
  setActiveQuickAccessPanel: (content: QuickAccessPanelContent) =>
    set({ activeQuickAccessPanel: content }),

  openAppDirectory: () => set({ activeQuickAccessPanel: "app-directory" }),

  openWorkspaceDirectory: () => set({ activeQuickAccessPanel: "workspace-directory" }),

  openExtensionSettings: () => set({ activeQuickAccessPanel: "extension-settings" }),

  closeQuickAccessPanel: () => set({ activeQuickAccessPanel: null }),
}))
