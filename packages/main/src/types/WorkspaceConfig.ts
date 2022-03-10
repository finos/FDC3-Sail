import { Workspace } from '../workspace';

export interface WorkspaceConfig {
  url?: string;
  channel?: string;
  onInit?: (workspace: Workspace) => Promise<any>;
  x?: number;
  y?: number;
}
