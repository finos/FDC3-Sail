import { Workspace } from '../workspace';
import { View } from '../view';
import { DirectoryApp } from './FDC3Data';

export interface ViewConfig {
  workspace?: Workspace;

  onReady?: (view: View) => Promise<View | void>;

  directoryData?: DirectoryApp;
}
