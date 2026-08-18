// ============================================================================
// @finos/sail-platform
// ============================================================================

// Workspaces and layouts
export type { Geometry, Layout, Panel, Rect, Tab, Workspace, WorkspaceSummary } from "./workspace"

export {
  createWorkspaceStore,
  type CreateWorkspaceOptions,
  type PanelInput,
  type WorkspaceState,
  type WorkspaceStore,
  type WorkspaceStoreOptions,
} from "./workspace"

// Storage
export {
  createLocalStorage,
  createMemoryStorage,
  type LocalStorageOptions,
  type SailStorage,
} from "./storage"
