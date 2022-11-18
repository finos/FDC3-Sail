import {
  ResolveError,
  AppIdentifier,
  IntentResolution,
  IntentResult,
  IntentMetadata,
} from '@finos/fdc3';
import { getRuntime } from '/@/index';
import { View } from '/@/view';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import {
  FDC3App,
  IntentInstance,
  FDC3AppDetail,
} from '/@/handlers/fdc3/1.2/types/FDC3Data';
import utils from '/@/utils';
import { FDC3_2_0_TOPICS } from './topics';
import { FDC3_1_2_TOPICS } from '/@/handlers/fdc3/1.2/topics';
import { ipcMain } from 'electron';
import { RUNTIME_TOPICS } from '/@/handlers/runtime/topics';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';

const resolveIntent = (message: RuntimeMessage): Promise<IntentResolution> => {
  return new Promise((resolve, reject) => {
    //find the app to route to
    try {
      const sView =
        message.data.selected &&
        message.data.selected.details &&
        message.data.selected.details.instanceId
          ? getRuntime().getView(message.data.selected.details.instanceId)
          : null;
      const source = message.source;
      if (message.data.intent) {
        const listeners = getRuntime().getIntentListeners(message.data.intent);
        //let keys = Object.keys(listeners);
        let appId: string | undefined = undefined;
        const id = (sView && sView.id) || undefined;
        listeners.forEach((listener) => {
          if (listener.source === id) {
            appId = listener.source;
          }
        });

        if (appId) {
          console.log('send intent from source', source);
          const app = getRuntime().getView(appId);
          if (app && app.content) {
            if (app.fdc3Version === '1.2') {
              app.content.webContents.send(FDC3_1_2_TOPICS.INTENT, {
                topic: 'intent',
                data: {
                  intent: message.data.intent,
                  context: message.data.context,
                },
                source: source,
              });
            } else {
              app.content.webContents.send(FDC3_2_0_TOPICS.INTENT, {
                topic: 'intent',
                data: {
                  intent: message.data.intent,
                  context: message.data.context,
                },
                source: source,
              });
            }

            if (sView && sView.parent && sView.parent.window) {
              sView.parent.window.webContents.send(RUNTIME_TOPICS.SELECT_TAB, {
                viewId: sView.id,
              });
              const id = (sView && sView.id) || '';

              resolve({
                source: {
                  appId: id,
                },
                intent: message.data.intent,
                version: '2.0',
                getResult: (): Promise<IntentResult> => {
                  return new Promise((resolve) => {
                    //to do...
                    resolve({
                      type: 'emptyResult',
                    });
                  });
                },
              });
            }
          }

          //keep array of pending, id by url,  store intent & context, timestamp
          //when a new window connects, throw out anything more than 2 minutes old, then match on url
        }
      }
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * create a heirarchy of App Instances grouped by intents
 */
const buildIntentInstanceTree = (
  data: Array<FDC3App>,
): Array<IntentInstance> => {
  const r: Array<IntentInstance> = [];

  const found: Map<string, Array<FDC3App>> = new Map();
  const intentMetadata: Array<IntentMetadata> = [];

  if (data) {
    data.forEach((item) => {
      const intents =
        item.details.directoryData?.interop?.intents?.listensFor ?? {};

      Object.keys(intents).forEach((intentId) => {
        if (!found.has(intentId)) {
          const intent = intents[intentId];
          intentMetadata.push({
            name: intentId,
            displayName: intent.displayName ?? intentId,
          });
          found.set(intentId, [item]);
        } else {
          const intents = found.get(intentId);
          if (intents) {
            intents.push(item);
          }
        }
      });
    });
  }

  intentMetadata.forEach((intent) => {
    const apps: Array<FDC3App> = found.get(intent.name) || [];

    const entry: IntentInstance = { intent: intent, apps: apps };

    r.push(entry);
  });

  return r;
};
const getAppTitle = (app: FDC3App): string => {
  const runtime = getRuntime();
  const view = app.details.instanceId
    ? runtime.getViews().get(app.details.instanceId)
    : null;
  const directory = app.details.directoryData
    ? app.details.directoryData
    : null;
  return directory
    ? directory.title ?? 'Untitled'
    : view &&
      view.content.webContents &&
      view.content.webContents.hostWebContents
    ? view.content.webContents.hostWebContents.getTitle()
    : 'Untitled';
};

const sortApps = (a: FDC3App, b: FDC3App): number => {
  //let aTitle = a.details.directoryData ? a.details.directoryData.title : a.details.view.content.webContents.getURL();
  // let bTitle = b.details.directoryData ? b.details.directoryData.title : b.details.view.content.webContents.getURL();
  if (a.details) {
    a.details.title = getAppTitle(a);
  }
  if (b.details) {
    b.details.title = getAppTitle(b);
  }

  if (
    a.details &&
    a.details.title &&
    b.details &&
    b.details.title &&
    a.details.title < b.details.title
  ) {
    return -1;
  }
  if (
    a.details &&
    a.details.title &&
    b.details &&
    b.details.title &&
    a.details.title > b.details.title
  ) {
    return 1;
  } else {
    return 0;
  }
};

export const raiseIntent = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const r: Array<FDC3App> = [];
  const intent = message.data?.intent;

  if (!intent) {
    throw new Error(ResolveError.NoAppsFound);
  }

  //only support string targets for now...
  const target: AppIdentifier = message.data.target;

  let intentListeners;
  if (target) {
    intentListeners = runtime.getIntentListenersByAppId(intent, target);
  } else {
    intentListeners = runtime.getIntentListeners(intent);
  }

  const sourceView = runtime.getView(message.source);
  const sourceName =
    sourceView && sourceView.directoryData
      ? sourceView.directoryData.name
      : 'unknown';

  if (intentListeners) {
    // let keys = Object.keys(intentListeners);
    intentListeners.forEach((listener) => {
      ///ignore listeners from the view that raised the intent
      if (listener.viewId && listener.viewId !== message.source) {
        //look up the details of the window and directory metadata in the "connected" store
        const view = runtime.getView(listener.viewId);
        //de-dupe
        if (
          view &&
          !r.find((item) => {
            return item.details.instanceId === view.id;
          })
        ) {
          r.push({
            type: 'window',
            details: {
              instanceId: view.id,
              directoryData: view.directoryData,
            },
          });
        }
      }
    });
  }
  //pull intent handlers from the directory
  let ctx = '';
  if (message.data && message.data.context) {
    ctx = message.data.context.type;
  }

  const data: Array<DirectoryApp> = runtime
    .getDirectory()
    .retrieveByIntentAndContextType(intent, ctx);
  if (data) {
    data.forEach((entry: DirectoryApp) => {
      r.push({
        type: 'directory',
        details: { directoryData: entry },
      });
    });
  }

  if (r.length > 0) {
    if (r.length === 1) {
      const theApp = r[0];
      const appDetails = theApp.details;
      //if there is only one result, use that
      //if it is an existing view, post a message directly to it
      //if it is a directory entry resolve the destination for the intent and launch it
      //dedupe window and directory items
      if (theApp.type === 'window' && appDetails && appDetails.instanceId) {
        const view = runtime.getView(appDetails.instanceId);
        if (view) {
          if (view.fdc3Version === '1.2') {
            view.content.webContents.send(FDC3_1_2_TOPICS.INTENT, {
              topic: 'intent',
              data: message.data,
              source: message.source,
            });
          } else {
            view.content.webContents.send(FDC3_2_0_TOPICS.INTENT, {
              topic: 'intent',
              data: message.data,
              source: message.source,
            });
          }
          //bringing the tab to front conditional on the type of intent
          if (!utils.isDataIntent(intent)) {
            /* utils.bringToFront(r[0].details.port); */
          }

          return {
            source: { name: view.directoryData?.name, appId: message.source },
            version: '2.0',
          };
        }
      } else if (theApp.type === 'directory' && appDetails.directoryData) {
        const directoryData = appDetails.directoryData;
        const directoryDetails = appDetails.directoryData
          .details as DirectoryAppLaunchDetailsWeb;

        const start_url = directoryDetails.url;
        const pending = true;

        const workspace = getRuntime().createWorkspace();

        const view = workspace.createView(start_url, {
          directoryData: directoryData,
        });
        //view.directoryData = r[0].details.directoryData;
        //set pending intent for the view..
        if (pending) {
          view.setPendingIntent(
            intent,
            (message.data && message.data.context) || undefined,
            message.source,
          );
        }

        return {
          source: { name: sourceName, appId: message.source },
          version: '2.0',
        };

        //send the context - if the default start_url was used...
        //get the window/tab...
        // resolve({result:true});
      }
    } else {
      //show resolver UI
      // Send a message to the active tab
      //sort results alphabetically, with directory entries first (before window entries)

      r.sort(sortApps);

      const eventId = `resolveIntent-${Date.now()}`;

      //set a handler for resolving the intent (when end user selects a destination)
      ipcMain.on(eventId, async (event, args) => {
        const r: IntentResolution = await resolveIntent(args);
        return r;
      });

      //launch window with resolver UI
      // console.log('resolve intent - options', r);
      const sourceView = getRuntime().getView(message.source);
      if (sourceView) {
        getRuntime().openResolver(
          {
            intent: intent,
            context: (message.data && message.data.context) || undefined,
          },
          sourceView,
          r,
        );
      }
    }
  } else {
    //show message indicating no handler for the intent...
    throw new Error(ResolveError.NoAppsFound);
  }
};

export const raiseIntentForContext = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const sourceView = runtime.getView(message.source);
  const sourceName =
    sourceView && sourceView.directoryData
      ? sourceView.directoryData.name
      : 'unknown';

  const r: Array<FDC3App> = [];

  const context =
    message.data?.context && message.data?.context?.type
      ? message.data.context.type
      : '';

  const intentListeners = runtime.getIntentListenersByContext(context);

  if (intentListeners) {
    // let keys = Object.keys(intentListeners);
    intentListeners.forEach((listeners: Array<View>) => {
      //look up the details of the window and directory metadata in the "connected" store
      listeners.forEach((view: View) => {
        //de-dupe
        if (
          !r.find((item) => {
            return (
              item.details.instanceId && item.details.instanceId === view.id
            );
          })
        ) {
          const title = view.getTitle();
          const details: FDC3AppDetail = {
            instanceId: view.id,
            title: title,
            directoryData: view.directoryData,
          };
          r.push({ type: 'window', details: details });
        }
      });
    });
  }

  /**
   * To Do: Support additional AppMetadata searching (other than name)
   */
  const target: AppIdentifier =
    (message.data && message.data.target) || undefined;

  const data = getRuntime().getDirectory().retrieveByContextType(context);

  if (data) {
    data.forEach((entry: DirectoryApp) => {
      if (target) {
        if (entry.appId === target.appId) {
          r.push({ type: 'directory', details: { directoryData: entry } });
        }
      } else {
        r.push({ type: 'directory', details: { directoryData: entry } });
      }
    });
  }

  if (r.length > 0) {
    if (r.length === 1) {
      //if there is only one result, use that
      //if it is a window, post a message directly to it
      //if it is a directory entry resolve the destination for the intent and launch it
      //dedupe window and directory items
      if (r[0].type === 'window' && r[0].details.instanceId) {
        const view = runtime.getView(r[0].details.instanceId);
        if (view) {
          if (view.fdc3Version === '1.2') {
            view.content.webContents.send(FDC3_1_2_TOPICS.INTENT, {
              topic: 'intent',
              data: message.data,
              source: message.source,
            });
          } else {
            view.content.webContents.send(FDC3_2_0_TOPICS.INTENT, {
              topic: 'intent',
              data: message.data,
              source: message.source,
            });
          }

          return { source: message.source, version: '1.2' };
        } else {
          throw new Error(ResolveError.NoAppsFound);
        }
      } else if (r[0].type === 'directory' && r[0].details.directoryData) {
        const start_url = (
          r[0].details.directoryData.details as DirectoryAppLaunchDetailsWeb
        ).url;
        const pending = true;

        //let win = window.open(start_url,"_blank");
        const workspace = getRuntime().createWorkspace();

        const view = workspace.createView(start_url, {
          directoryData: r[0].details.directoryData,
        });
        //view.directoryData = r[0].details.directoryData;
        //set pending intent for the view..
        const intent = message.data && message.data.intent;
        if (pending && intent) {
          view.setPendingIntent(
            intent,
            (message.data && message.data.context) || undefined,
            message.source,
          );
        }

        return {
          source: { name: sourceName, appId: message.source },
          version: '1.2',
        };
      }
    } else {
      //show resolver UI
      // Send a message to the active tab
      //sort results alphabetically, with directory entries first (before window entries)

      r.sort(sortApps);

      const eventId = `resolveIntent-${Date.now()}`;

      //set a handler for resolving the intent (when end user selects a destination)
      ipcMain.on(eventId, async (event, args) => {
        const r = await resolveIntent(args);
        return r;
      });

      //launch window with resolver UI
      console.log('resolve intent - options', r);
      const sourceView = getRuntime().getView(message.source);
      if (sourceView) {
        try {
          getRuntime().openResolver(
            { context: (message.data && message.data.context) || undefined },
            sourceView,
            buildIntentInstanceTree(r),
          );
        } catch (err) {
          console.log('error opening resolver', err);
        }
      }
    }
  } else {
    //show message indicating no handler for the intent...
    throw new Error(ResolveError.NoAppsFound);
  }
};
