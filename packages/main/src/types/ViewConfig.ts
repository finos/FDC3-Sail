import { Workspace } from '../workspace';
import { View } from '../view';
import { DirectoryApp } from '../directory/directory';

export interface ViewConfig {
  workspace?: Workspace;

  onReady?: (view: View) => Promise<View | void>;

  directoryData?: DirectoryApp;
}
