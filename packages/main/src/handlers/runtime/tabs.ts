import { getRuntime } from '../../index';
import { RuntimeMessage } from '../runtimeMessage';
import { RUNTIME_TOPICS } from './topics';
import { Point, screen } from 'electron';
import { Workspace } from '../../workspace';

export const tabSelected = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  //bring selected browserview to front
  const workspace = runtime?.getWorkspace(message.source);
  if (workspace) {
    workspace.setSelectedTab(message.data.selected);
  }
  return;
};

export const tabDragStart = async (message: RuntimeMessage) => {
  const runtime = getRuntime();

  const workspace = runtime.getWorkspace(message.source);
  if (workspace) {
    runtime.draggedTab = {
      tabId: message.data?.selected,
      source: message.source,
    };
  }
  return;
};

export const newTab = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  //bring selected browserview to front
  const workspace = runtime.getWorkspace(message.source);
  if (workspace) {
    workspace.createView();
  }
  return;
};

export const dropTab = async (message: RuntimeMessage) => {
  const runtime = getRuntime();

  if (runtime.draggedTab) {
    console.log(
      'dragged tab',
      runtime.draggedTab.tabId,
      runtime.draggedTab.source,
    );
  }
  let tabId: string | undefined;
  let source: string | undefined;
  if (runtime.draggedTab) {
    tabId = runtime.draggedTab.tabId;
    source = runtime.draggedTab.source;
    runtime.draggedTab = null;
  }
  //to do: handle droppng on an existing workspace
  //get cursor position
  const p: Point = screen.getCursorScreenPoint();
  //  const targetWS = resolveWorkspaceFromPoint(p);
  let targetWS: Workspace | undefined;
  //add to existing?
  if (message.data.frameTarget) {
    targetWS = runtime.getWorkspace(message.source);
  }
  if (targetWS && tabId && source) {
    const oldWorkspace = runtime.getWorkspace(source);
    const draggedView = runtime.getView(tabId);
    //workspace
    if (oldWorkspace && draggedView) {
      //send event to UI to visually remove the tab
      console.log('calling remove tab');
      await oldWorkspace.removeTab(draggedView.id);
      await targetWS.addTab(draggedView.id);
    }
  } else if (tabId) {
    //make a new workspace and window
    const workspace = runtime.createWorkspace({
      x: p.x,
      y: p.y,
      onInit: () => {
        console.log('workspace created', workspace.id);
        return new Promise((resolve) => {
          if (tabId) {
            const oldWorkspace = runtime.getWorkspace(message.source);
            const draggedView = runtime.getView(tabId);
            //workspace
            if (oldWorkspace && draggedView) {
              //send event to UI to visually remove the tab
              if (oldWorkspace.window) {
                console.log('removing tab - sending message to client');
                oldWorkspace.window.webContents.send(
                  RUNTIME_TOPICS.REMOVE_TAB,
                  {
                    tabId: tabId,
                  },
                );
              }
              oldWorkspace.removeTab(tabId).then(() => {
                if (tabId) {
                  workspace.addTab(tabId);
                }
              });
            }
          }
          resolve();
        });
      },
    });
    runtime.draggedTab = null;
  }
  return;
};

export const closeTab = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  //bring selected browserview to front
  const workspace = runtime.getWorkspace(message.source);
  if (workspace) {
    workspace.closeTab(message.data.tabId);
  }
  return;
};

export const tearOutTab = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const tabId: string | undefined = message.data.tabId;

  //to do: handle droppng on an existing workspace
  //get cursor position
  const p: Point = screen.getCursorScreenPoint();
  if (tabId) {
    //make a new workspace and window
    const workspace = runtime.createWorkspace({
      x: p.x,
      y: p.y,
      onInit: () => {
        return new Promise((resolve) => {
          if (tabId) {
            const oldWorkspace = runtime.getWorkspace(message.source);
            const draggedView = runtime.getView(tabId);
            //workspace
            if (oldWorkspace && draggedView) {
              //send event to UI to visually remove the tab
              if (oldWorkspace.window) {
                console.log('removing tab - sending message to client');
                oldWorkspace.window.webContents.send(
                  RUNTIME_TOPICS.REMOVE_TAB,
                  {
                    tabId: tabId,
                  },
                );
              }
              oldWorkspace.removeTab(tabId, true).then(() => {
                if (tabId) {
                  workspace.addTab(tabId);
                }
              });
            }
          }
          resolve();
        });
      },
    });
  }
};
