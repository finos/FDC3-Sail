import { listeners as fdc33Listeners } from './fdc3Listeners';
import { Listener } from '../types/Listener';
import { ipcMain } from 'electron';
import { Runtime } from '../runtime';
import { Workspace } from '../workspace';
import { getRuntime } from '../index';
import { FDC3Message } from '../types/FDC3Message';
import { DirectoryApp } from '../types/FDC3Data';
import { Point } from 'electron';
import { screen } from 'electron';
import utils from '../utils';
import fetch from 'electron-fetch';
import { TOPICS, TARGETS } from '../constants';
//import { ipcRenderer } from 'electron';

/**
 * find workspace on a screen coordinate
 */
const resolveWorkspaceFromPoint = (point: Point): Workspace | null => {
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
};

export class RuntimeListener {
  runtime: Runtime;

  constructor(runtime: Runtime) {
    this.runtime = runtime;

    ipcMain.on(TOPICS.FDC3_GET_ACTION_URL, async (event, args) => {
      const directoryUrl = await utils.getDirectoryUrl();
      const templateR = await fetch(
        `${directoryUrl}/apps/${args.data.appName}/action`,
        { method: 'POST', body: JSON.stringify(args.data) },
      );
      const actionR = await templateR.text();
      const source = this.runtime.getView(args.source);
      console.log('sending action URL', actionR);
      if (source && source.content && source.content.webContents) {
        source.content.webContents.send(`FDC3:${args.eventId}`, {
          data: actionR,
        });
      } else {
        setTimeout(() => {
          if (source && source.content) {
            source.content.webContents.send(`FDC3:${args.eventId}`, {
              data: actionR,
            });
          }
        }, 300);
      }
    });

    ipcMain.on(TOPICS.SELECT_TAB, (event, args) => {
      //bring selected browserview to front
      const workspace = this.runtime.getWorkspace(args.source);
      if (workspace) {
        workspace.setSelectedTab(args.selected);
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
      //to do: handle droppng on an existing workspace
      //get cursor position
      const p: Point = screen.getCursorScreenPoint();
      const targetWS = resolveWorkspaceFromPoint(p);

      //add to existing?
      //if (args.target){
      //    targetWS = runtime.getWorkspace(args.target);
      if (targetWS) {
        const oldWorkspace = this.runtime.getWorkspace(args.source);
        const draggedView = this.runtime.getView(args.tabId);
        //workspace
        if (oldWorkspace && draggedView) {
          await oldWorkspace.removeTab(draggedView.id);
          if (targetWS) {
            await targetWS.addTab(draggedView.id);
          }
        }
      } else {
        //make a new workspace and window
        const workspace = this.runtime.createWorkspace({
          x: p.x,
          y: p.y,
          onInit: () => {
            console.log('workspace created', workspace.id);
            return new Promise((resolve) => {
              const oldWorkspace = this.runtime.getWorkspace(args.source);
              const draggedView = this.runtime.getView(args.tabId);
              //workspace
              if (oldWorkspace && draggedView) {
                oldWorkspace.removeTab(draggedView.id).then(() => {
                  workspace.addTab(draggedView.id);
                });
              }
              resolve(null);
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
    //{'source':id,'selected':event.detail.selected});

    /*ipcMain.on(TOPICS.JOIN_CHANNEL, (event, args) => {
      console.log('join channel', args.channel);
    });*/

    ipcMain.on(TOPICS.FETCH_FROM_DIRECTORY, (event, args) => {
      utils.getDirectoryUrl().then((directoryUrl) => {
        fetch(`${directoryUrl}${args.query}`).then((response) => {
          response.json().then((result) => {
            console.log(
              'fetch from directory',
              `${directoryUrl}${args.query}`,
              result,
            );
            const sourceWS = runtime.getWorkspace(args.source);
            if (sourceWS && sourceWS.window) {
              sourceWS.window.webContents.send(
                `${TOPICS.FETCH_FROM_DIRECTORY}-${args.query}`,
                { data: result },
              );
            }
          });
        });
      });
    });

    ipcMain.on(TOPICS.FRAME_DEV_TOOLS, (event, args) => {
      //for now, just assume one view per workspace, and open that
      console.log('ipc-event', event.type);
      const sourceWS = runtime.getWorkspace(args.source);
      if (sourceWS && sourceWS.window) {
        sourceWS.window.webContents.openDevTools();
      }
    });

    ipcMain.on(TOPICS.TAB_DEV_TOOLS, (event, args) => {
      //for now, just assume one view per workspace, and open that
      console.log('ipc-event', event.type);
      const sourceWS = runtime.getWorkspace(args.source);
      if (sourceWS && sourceWS.selectedTab) {
        const selectedTab = this.runtime.getView(sourceWS.selectedTab);
        if (selectedTab && selectedTab.content) {
          selectedTab.content.webContents.openDevTools();
        }
      }
    });

    ipcMain.on(TOPICS.RES_LOAD_RESULTS, (event, args) => {
      console.log('ipc-event', event.type);
      const sourceWS = runtime.getWorkspace(args.source);
      if (sourceWS) {
        sourceWS.loadSearchResults(args.results);
      }
    });

    ipcMain.on(TOPICS.NAVIGATE, (event, args) => {
      console.log('ipc-event', event.type);
      const workspace = this.runtime.getWorkspace(args.source);
      if (workspace) {
        workspace.createView(args.url);
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
      console.log('ipc-event', event.type);
      const sourceWS = runtime.getWorkspace(args.source);
      if (sourceWS) {
        sourceWS.showChannelWindow();
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
        //are there actions defined?
        const data: DirectoryApp = args.selected.directoryData;

        const directoryUrl = await utils.getDirectoryUrl();
        const hasActionsR = await fetch(
          `${directoryUrl}/apps/${data.name}/actions`,
          { headers: { 'Content-Type': 'application/json' }, method: 'GET' },
        );
        const hasActionsJSON = await hasActionsR.json();
        const hasActions: boolean =
          (hasActionsJSON.intents && hasActionsJSON.intents.length > 0) ||
          (hasActionsJSON.contexts && hasActionsJSON.contexts.length > 0);
        data.hasActions = hasActions;
        if (hasActions) {
          const body = { intent: args.intent, context: args.context };
          const templateR = await fetch(
            `${directoryUrl}/apps/${data.name}/action`,
            {
              headers: { 'Content-Type': 'application/json' },
              method: 'POST',
              body: JSON.stringify(body),
            },
          );
          const action_url = await templateR.text();
          //if we get a valid action url back, set that as the start and don't post pending data
          if (action_url) {
            data.start_url = action_url;
            //  data.pending = false;
          }
        }
        //launch window
        const runtime = getRuntime();
        if (runtime) {
          const win = runtime.createWorkspace();
          const view = win.createView(data.start_url, {
            directoryData: data as DirectoryApp,
          });

          //set pending intent and context, if not action drive (and intent needs to be applied after the app's initial load)
          if (!data.hasActions) {
            runtime.setPendingIntent(
              view.id,
              args.id,
              args.intent,
              args.context,
            );
          }
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
      const resolver = this.runtime.getResolvers().get(args.id);
      if (resolver) {
        resolver.close();
      }
    });
  }

  listenForEvent(l: Listener) {
    const runtime = this.runtime;

    ipcMain.on(l.name, (event, args) => {
      l.handler.call(this, runtime, args as FDC3Message).then((r: any) => {
        console.log('handler response', r, 'args', args);

        if (event.ports) {
          event.ports[0].postMessage({
            topic: args.data.eventId,
            data: r,
          });
        }
      });
    });
  }

  listen(): void {
    //the type of events we will listen for

    fdc33Listeners.forEach((l) => {
      this.listenForEvent(l);
    });
  }
}
