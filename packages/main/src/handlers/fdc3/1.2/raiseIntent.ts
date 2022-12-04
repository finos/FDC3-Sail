import { ResolveError, TargetApp, AppMetadata, IntentMetadata } from 'fdc3-1.2';
import { getRuntime } from '/@/index';
import { View } from '/@/view';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import {
  FDC3App,
  IntentInstance,
  FDC3AppDetail,
} from '/@/handlers/fdc3/1.2/types/FDC3Data';
import { FDC3_1_2_TOPICS } from './topics';
import { FDC3_2_0_TOPICS } from '../2.0/topics';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';

export const resolveIntent = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  let view: View | undefined;

  //TODO: autojoin the new app to the channel which the 'open' call is sourced from

  if (!message.data.selected.instanceId) {
    const data: DirectoryApp = message.data.selected?.directoryData;

    //launch window
    const runtime = getRuntime();
    if (runtime) {
      const win = runtime.createWorkspace();
      view = await win.createView(
        (data.details as DirectoryAppLaunchDetailsWeb).url,
        {
          directoryData: data as DirectoryApp,
        },
      );

      //set pending intent and context
      view.setPendingIntent(
        message.data.intent,
        message.data.context,
        message.data.id,
      );
    }
  } else {
    view = runtime.getView(message.data.selected?.instanceId);
    //send new intent
    if (view && view.parent) {
      if (view.fdc3Version === '1.2') {
        view.content.webContents.send(FDC3_1_2_TOPICS.INTENT, {
          topic: 'intent',
          data: { intent: message.data.intent, context: message.data.context },
        });
      } else {
        view.content.webContents.send(FDC3_2_0_TOPICS.INTENT, {
          topic: 'intent',
          data: { intent: message.data.intent, context: message.data.context },
          source: message.data.id,
        });

        view.parent.setSelectedTab(view.id);
      }
    }
  }
  //send the resolution to the source
  const resolver = runtime.getResolver();

  //close the resolver

  if (resolver) {
    const sourceView = runtime.getView(resolver?.source);
    if (sourceView) {
      const topic =
        sourceView.fdc3Version === '1.2'
          ? FDC3_1_2_TOPICS.RESOLVE_INTENT
          : FDC3_2_0_TOPICS.RESOLVE_INTENT;
      sourceView.content.webContents.send(topic, {
        source: {
          name: view?.directoryData?.name,
          appId: view?.directoryData?.appId,
        },
        version: sourceView.fdc3Version,
      });
    }
    resolver.close();
  }
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
  const results: Array<FDC3App> = [];
  const intent = message.data?.intent;
  let intentTarget: string | undefined; //the id of the app the intent gets routed to (if unambigious)
  const intentContext = message.data?.context?.type || '';

  if (!intent) {
    //return {error:ResolveError.NoAppsFound};
    throw ResolveError.NoAppsFound;
  }

  //only support string targets for now...
  const target: string | undefined = message?.data?.target?.name
    ? message.data.target.name
    : message?.data?.target?.appId
    ? message.data.target.appId
    : typeof message?.data?.target === 'string'
    ? message.data.target
    : undefined;

  const intentListeners = target
    ? runtime.getIntentListenersByAppName(intent, target)
    : runtime.getIntentListeners(intent);

  if (intentListeners) {
    // let keys = Object.keys(intentListeners);
    intentListeners.forEach((listener) => {
      let addView = true;
      //look up the details of the window and directory metadata in the "connected" store
      const view = listener.viewId
        ? runtime.getView(listener.viewId)
        : undefined;

      //skip if can't be resolved to a view
      if (!view) {
        addView = false;
      }

      ///ignore listeners from the view that raised the intent
      if (listener.viewId && listener.viewId === message.source) {
        addView = false;
      }
      //ensure we are not sending the intent back to the source
      if (listener.viewId && listener.viewId === message.source) {
        addView = false;
      }
      //de-dupe
      if (
        view &&
        results.find((item) => {
          return item.details.instanceId === view.id;
        })
      ) {
        addView = false;
      }

      //match on context, if provided
      if (
        intentContext &&
        view &&
        view.directoryData?.interop?.intents?.listensFor &&
        view.directoryData?.interop?.intents?.listensFor[intent]
      ) {
        let hasContext = false;
        const viewIntent =
          view.directoryData.interop.intents.listensFor[intent];

        if (
          viewIntent.contexts &&
          viewIntent.contexts.indexOf(intentContext) > -1
        ) {
          hasContext = true;
        }

        if (!hasContext) {
          addView = false;
        }
      }

      if (view && addView) {
        results.push({
          type: 'window',
          details: {
            instanceId: view.id,
            directoryData: view.directoryData,
          },
        });
      }
    });
  }
  //pull intent handlers from the directory
  const data: Array<DirectoryApp> = runtime
    .getDirectory()
    .retrieveByIntentAndContextType(intent, intentContext);

  if (data) {
    data.forEach((entry: DirectoryApp) => {
      let addResult = true;
      if (target && entry.name !== target) {
        addResult = false;
      }
      if (addResult) {
        results.push({
          type: 'directory',
          details: { directoryData: entry },
        });
      }
    });
  }

  if (results.length > 0) {
    if (results.length === 1) {
      const theApp = results[0];
      const appDetails = theApp.details;
      //if there is only one result, use that
      //if it is an existing view, post a message directly to it
      //if it is a directory entry resolve the destination for the intent and launch it
      //dedupe window and directory items
      if (theApp.type === 'window' && appDetails?.instanceId) {
        intentTarget = appDetails?.instanceId;
        const view = runtime.getView(intentTarget);
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

          return {
            source: {
              name: view.directoryData?.name,
              appId: view.directoryData?.appId,
            },
            version: '1.2',
          };
        }
      } else if (theApp.type === 'directory' && appDetails.directoryData) {
        const directoryData = appDetails.directoryData;
        const directoryDetails = appDetails.directoryData
          .details as DirectoryAppLaunchDetailsWeb;
        const start_url = directoryDetails.url;
        const pending = true;

        const view = await getRuntime().createView(start_url, {
          directoryData: directoryData,
        });

        //set pending intent for the view..
        if (view && pending) {
          view.setPendingIntent(
            intent,
            (message.data && message.data.context) || undefined,
            message.source,
          );
        }

        return {
          source: { name: directoryData.name, appId: directoryData.appId },
          version: '1.2',
        };
      }
    } else {
      //launch window with resolver UI

      results.sort(sortApps);
      const sourceView = getRuntime().getView(message.source);
      if (sourceView) {
        getRuntime().openResolver(
          {
            intent: intent,
            context: (message.data && message.data.context) || undefined,
          },
          sourceView,
          results,
        );
      }
    }
  } else {
    //show message indicating no handler for the intent...
    // return {error:ResolveError.NoAppsFound};
    throw ResolveError.NoAppsFound;
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

  const context: string =
    message.data?.context && message.data?.context?.type
      ? message.data.context.type
      : '';
  /**
   * To Do: Support additional AppMetadata searching (other than name)
   */
  const target: TargetApp | undefined =
    (message.data && message.data.target) || undefined;
  const name: string | undefined = target
    ? typeof target === 'string'
      ? target
      : (target as AppMetadata).name
    : '';

  const intentListeners = runtime.getIntentListenersByContext(context);

  if (intentListeners) {
    // let keys = Object.keys(intentListeners);
    intentListeners.forEach((listeners: Array<View>) => {
      let addListener = true;
      //look up the details of the window and directory metadata in the "connected" store
      listeners.forEach((view: View) => {
        if (name && name !== view.directoryData?.name) {
          addListener = false;
        }
        //de-dupe
        if (
          r.find((item) => {
            return (
              item.details.instanceId && item.details.instanceId === view.id
            );
          })
        ) {
          addListener = false;
        }

        if (addListener) {
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

  const data = getRuntime().getDirectory().retrieveByContextType(context);

  if (data) {
    data.forEach((entry: DirectoryApp) => {
      if (!name || (name && entry.name === name)) {
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
          //return {error:ResolveError.NoAppsFound};
          throw ResolveError.NoAppsFound;
        }
      } else if (r[0].type === 'directory' && r[0].details.directoryData) {
        const start_url = (
          r[0].details.directoryData.details as DirectoryAppLaunchDetailsWeb
        ).url;
        const pending = true;

        //let win = window.open(start_url,"_blank");
        const workspace = getRuntime().createWorkspace();

        const view = await workspace.createView(start_url, {
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
    //return {error:ResolveError.NoAppsFound};
    throw ResolveError.NoAppsFound;
  }
};
