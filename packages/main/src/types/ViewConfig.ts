import { Workspace } from '../workspace';
import { View } from '../view';
import { DirectoryApp } from '../directory/directory';
import { FDC3_VERSIONS } from './Versions';

export interface ViewConfig {
  workspace?: Workspace;

  onReady?: (view: View) => Promise<View | void>;

  directoryData?: DirectoryApp;

  version?: FDC3_VERSIONS;

  title?: string;

  isSystem?: boolean;
}
