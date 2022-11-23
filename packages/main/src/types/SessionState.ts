import { FDC3_VERSIONS } from './Versions';
import { ChannelData } from './Channel';
import { Context } from '@finos/fdc3';
import { DirectoryApp } from '../directory/directory';

export interface ViewState {
  id: string;
  url: string;
  title: string;
  parent: string; //id of parent workspace
  fdc3Version: FDC3_VERSIONS;
  channel: string;
  directoryData: DirectoryApp | null;
}

export interface WorkspaceState {
  id: string;
  views: Array<string>; //array of viewIds
  channel: string;
}

export interface ChannelState {
  channel: ChannelData;
  contexts: Array<Context>;
}

export interface SessionState {
  views: Array<ViewState>;
  viewsMap: { [key: string]: Array<string> };
  workspaces: Array<WorkspaceState>;
  channels: Array<ChannelState>;
}
