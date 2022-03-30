import { Workspace } from '../workspace';
import { View } from '../view';

export interface WorkspaceConfig {
  url?: string;
  channel?: string;
  onInit?: (workspace: Workspace) => Promise<View | void>;
  x?: number;
  y?: number;
}
