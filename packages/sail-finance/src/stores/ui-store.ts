import { create } from "zustand"

export type QuickAccessPanelContent = "app-directory" | "workspace-directory" | null

interface UIState {
  activeQuickAccessPanel: QuickAccessPanelContent
}

interface UIActions {
  setActiveQuickAccessPanel: (content: QuickAccessPanelContent) => void
  openAppDirectory: () => void
  openWorkspaceDirectory: () => void
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

  closeQuickAccessPanel: () => set({ activeQuickAccessPanel: null }),
}))
