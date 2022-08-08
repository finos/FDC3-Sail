import { listeners as fdc33Listeners } from './fdc3Listeners';
import { Listener } from '../types/Listener';
import { ipcMain, WebContents } from 'electron';
import { Runtime } from '../runtime';
import { Workspace } from '../workspace';
import { getRuntime } from '../index';
import { FDC3Message } from '../types/FDC3Message';
import { DirectoryApp } from '../types/FDC3Data';
import { Point, Menu, screen } from 'electron';
import utils from '../utils';
import fetch from 'electron-fetch';
import { TOPICS, TARGETS } from '../constants';

/**
 * find workspace on a screen coordinate
 */
/*const resolveWorkspaceFromPoint = (point: Point): Workspace | null => {
  const runtime = getRuntime();
  //compare to bounds of active workspace windows
  if (runtime) {
    runtime.getWorkspaces().forEach((w) => {
      if (w.window) {
        const bounds = w.window.getBounds();
        if (bounds) {
          if (
            point.x > bounds.x &&
            point.x < bounds.x + bounds.width &&
            point.y > bounds.y &&
            point.y < bounds.y + bounds.height
          ) {
            return w;
          }
        }
      }
    });
  }
  return null;
};*/

export class RuntimeListener {
  runtime: Runtime;

  draggedTab: { tabId: string; source: string } | null = null;

  constructor(runtime: Runtime) {
    this.runtime = runtime;
    //start with clean IPC
    ipcMain.removeAllListeners();

    ipcMain.on(TOPICS.TAB_SELECTED, (event, args) => {
      //bring selected browserview to front
      const workspace = this.runtime.getWorkspace(args.source);
      if (workspace) {
        workspace.setSelectedTab(args.selected);
      }
    });

    /**
     * register that a tab drag operation has started
     */
    ipcMain.on(TOPICS.TAB_DRAG_START, (event, args) => {
      //bring selected browserview to front
      //keep the dragged tab state in memory

      const workspace = this.runtime.getWorkspace(args.source);
      if (workspace) {
        this.draggedTab = { tabId: args.selected, source: args.source };
      }
    });

    ipcMain.on(TOPICS.NEW_TAB, (event, args) => {
      //bring selected browserview to front
      const workspace = this.runtime.getWorkspace(args.source);
      if (workspace) {
        workspace.createView();
      }
    });

    ipcMain.on(TOPICS.DROP_TAB, async (event, args) => {
      console.log('tab dropped', args.tabId, args.frameTarget, args.source);
      if (this.draggedTab) {
        console.log(
          'dragged tab',
          this.draggedTab.tabId,
          this.draggedTab.source,
        );
      }
      let tabId: string | undefined;
      let source: string | undefined;
      if (this.draggedTab) {
        tabId = this.draggedTab.tabId;
        source = this.draggedTab.source;
        this.draggedTab = null;
      }
      //to do: handle droppng on an existing workspace
      //get cursor position
      const p: Point = screen.getCursorScreenPoint();
      //  const targetWS = resolveWorkspaceFromPoint(p);
      let targetWS: Workspace | undefined;
      //add to existing?
      if (args.frameTarget) {
        targetWS = runtime.getWorkspace(args.source);
      }
      if (targetWS && tabId && source) {
        const oldWorkspace = this.runtime.getWorkspace(source);
        const draggedView = this.runtime.getView(tabId);
        //workspace
        if (oldWorkspace && draggedView) {
          //send event to UI to visually remove the tab
          console.log('calling remove tab');
          await oldWorkspace.removeTab(draggedView.id);
          await targetWS.addTab(draggedView.id);
        }
      } else if (tabId) {
        //make a new workspace and window
        const workspace = this.runtime.createWorkspace({
          x: p.x,
          y: p.y,
          onInit: () => {
            console.log('workspace created', workspace.id);
            return new Promise((resolve) => {
              if (tabId) {
                const oldWorkspace = this.runtime.getWorkspace(args.source);
                const draggedView = this.runtime.getView(tabId);
                //workspace
                if (oldWorkspace && draggedView) {
                  //send event to UI to visually remove the tab
                  if (oldWorkspace.window) {
                    console.log('removing tab - sending message to client');
                    oldWorkspace.window.webContents.send(TOPICS.REMOVE_TAB, {
                      tabId: tabId,
                    });
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
        this.draggedTab = null;
      }
    });

    ipcMain.on(TOPICS.TEAR_OUT_TAB, async (event, args) => {
      const tabId: string | undefined = args.tabId;

      //to do: handle droppng on an existing workspace
      //get cursor position
      const p: Point = screen.getCursorScreenPoint();
      if (tabId) {
        //make a new workspace and window
        const workspace = this.runtime.createWorkspace({
          x: p.x,
          y: p.y,
          onInit: () => {
            return new Promise((resolve) => {
              if (tabId) {
                const oldWorkspace = this.runtime.getWorkspace(args.source);
                const draggedView = this.runtime.getView(tabId);
                //workspace
                if (oldWorkspace && draggedView) {
                  //send event to UI to visually remove the tab
                  if (oldWorkspace.window) {
                    console.log('removing tab - sending message to client');
                    oldWorkspace.window.webContents.send(TOPICS.REMOVE_TAB, {
                      tabId: tabId,
                    });
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
    });

    ipcMain.on(TOPICS.CLOSE_TAB, (event, args) => {
      //bring selected browserview to front
      const workspace = this.runtime.getWorkspace(args.source);
      if (workspace) {
        workspace.closeTab(args.tabId);
      }
    });

    ipcMain.on(TOPICS.OPEN_TOOLS_MENU, (event, args) => {
      //bring selected browserview to front
      const workspace = this.runtime.getWorkspace(args.source);
      if (workspace) {
        const template = [
          {
            label: 'Frame Dev Tools',
            click: () => {
              if (workspace && workspace.window) {
                workspace.window.webContents.openDevTools();
              }
            },
          },
          {
            label: 'Tab Dev Tools',
            click: () => {
              if (workspace && workspace.selectedTab) {
                const selectedTab = this.runtime.getView(workspace.selectedTab);
                if (selectedTab && selectedTab.content) {
                  selectedTab.content.webContents.openDevTools();
                }
              }
            },
          },
        ];

        const menu = Menu.buildFromTemplate(template);
        menu.popup();
      }
    });

    ipcMain.on(TOPICS.FETCH_FROM_DIRECTORY, (event, args) => {
      console.log('ipcRenderer', event.type);
      utils.getDirectoryUrl().then((directoryUrl) => {
        fetch(`${directoryUrl}${args.query}`).then((response) => {
          response.json().then((result) => {
            //request can come frome 2 types of (priviledged) sources: the workspace UI and views
            //if the sourceType is View.  We need to check that the view is a 'system' view and can access the directory
            //through this API.  Today, this is only the 'home' view.
            let wContents: WebContents | undefined = undefined;

            if (args.sourceType && args.sourceType === 'view') {
              //ensure this is a view that has permissions for this api
              const sourceView = runtime.getView(args.source);
              if (
                sourceView &&
                sourceView.isSystemView() &&
                sourceView.content
              ) {
                wContents = sourceView.content.webContents;
              }
            } else {
              const sourceWS = runtime.getWorkspace(args.source);
              if (sourceWS && sourceWS.window) {
                wContents = sourceWS.window.webContents;
              }
            }

            if (wContents) {
              wContents.send(`${TOPICS.FETCH_FROM_DIRECTORY}-${args.query}`, {
                data: result,
              });
            }
          });
        });
      });
    });

    ipcMain.on(TOPICS.RES_LOAD_RESULTS, (event, args) => {
      console.log('ipc-event', event.type);
      const sourceWS = runtime.getWorkspace(args.source);
      if (sourceWS) {
        sourceWS.loadSearchResults(args.results);
      }
    });

    ipcMain.on(TOPICS.HIDE_WINDOW, (event, args) => {
      console.log('ipc-event', event.type);
      const workspace = this.runtime.getWorkspace(args.source);
      if (workspace) {
        switch (args.target) {
          case TARGETS.SEARCH_RESULTS:
            workspace.hideSearchResults();
            break;
          case TARGETS.CHANNEL_PICKER:
            workspace.hideChannelWindow();
            break;
        }
      }
    });

    ipcMain.on(TOPICS.RES_PICK_CHANNEL, (event, args) => {
      console.log('ipc-event', event.type, args);
      const sourceWS = runtime.getWorkspace(args.source);
      const mouseX: number = args.mouseX ? args.mouseX : 0;
      const mouseY: number = args.mouseY ? args.mouseY : 0;
      if (sourceWS) {
        sourceWS.showChannelWindow(mouseX, mouseY);
      }
    });

    ipcMain.on(TOPICS.JOIN_CHANNEL, (event, args) => {
      console.log('ipc-event', event.type);
      const sourceWS = runtime.getWorkspace(args.source);
      if (sourceWS) {
        sourceWS.setChannel(args.channel);
      }
    });

    ipcMain.on(TOPICS.RES_RESOLVE_INTENT, async (event, args) => {
      console.log('ipc-event', event.type);
      console.log('resolveIntent', args);

      //TODO: autojoin the new app to the channel which the 'open' call is sourced from

      if (!args.selected.instanceId) {
        const data: DirectoryApp = args.selected.directoryData;

        //launch window
        const runtime = getRuntime();
        if (runtime) {
          const win = runtime.createWorkspace();
          const view = win.createView(data.start_url, {
            directoryData: data as DirectoryApp,
          });

          //set pending intent and context
          view.setPendingIntent(args.intent, args.context, args.id);
        }
      } else {
        const view = this.runtime.getView(args.selected.instanceId);
        //send new intent
        if (view && view.parent) {
          view.content.webContents.send(TOPICS.FDC3_INTENT, {
            topic: 'intent',
            data: { intent: args.intent, context: args.context },
            source: args.id,
          });
          view.parent.setSelectedTab(view.id);
        }
      }

      //close the resolver
      const resolver = this.runtime.getResolver();
      if (resolver) {
        resolver.close();
      }
    });
  }

  listenForEvent(l: Listener) {
    const runtime = this.runtime;

    ipcMain.on(l.name, (event, args) => {
      l.handler.call(this, runtime, args as FDC3Message).then(
        (r) => {
          console.log('handler response', r, 'args', args);

          if (event.ports) {
            event.ports[0].postMessage({
              topic: args.data.eventId,
              data: r,
            });
          }
        },
        (err) => {
          console.log('handler error', err, 'args', args);

          if (event.ports) {
            event.ports[0].postMessage({
              topic: args.data.eventId,
              error: err,
            });
          }
        },
      );
    });
  }

  listen(): void {
    //the type of events we will listen for

    fdc33Listeners.forEach((l) => {
      this.listenForEvent(l);
    });
  }
}
