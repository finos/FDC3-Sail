import { getRuntime } from '/@/index';
import { View } from '/@/view';
import { FDC3App, FDC3AppDetail, SailIntentResolution } from '/@/types/FDC3Data';
import { FDC3_TOPICS } from '../topics';
import { buildIntentInstanceTree, sortApps } from './resolveIntent';
import {
  FDC3Message,
  RaiseIntentData,
  RaiseIntentContextData,
  SailTargetIdentifier,
} from '/@/types/FDC3Message';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
  DirectoryIntent,
} from '/@/directory/directory';
import { AppNotFound, NoAppsFound, ResolverUnavailable } from '/@/types/FDC3Errors';
import { FDC3Listener } from '/@/types/FDC3Listener';

function collectRunningIntentResults(message: FDC3Message, results: Array<FDC3App>) {
  const data = message.data as RaiseIntentData;
  const runtime = getRuntime();
  let intentListeners: Map<string, FDC3Listener> = new Map();
  const target = data.target as SailTargetIdentifier | undefined;
  const intent = data.intent;
  const intentContext = data.context?.type || '';

  function matchIntentAndContext(dd?: DirectoryApp): boolean {
    const listensFor = dd?.interop?.intents?.listensFor;
    const viewIntent = listensFor == undefined ? undefined : listensFor[intent];

    if (viewIntent == undefined) {
      return false;
    } else if (intentContext) {
      return (viewIntent.contexts && viewIntent.contexts.indexOf(intentContext) > -1);
    } else {
      return true;
    }
  }

  function matchTarget(v: View) {
    if (target?.instanceId) {
      return v.id == target.instanceId
    } else if (target?.appId) {
      return v.config?.directoryData?.appId == target.appId;
    } else {
      return true;
    }
  }

  if (target?.appId && target?.instanceId) {
    intentListeners = runtime.getIntentListenersByAppIdAndInstanceId(intent, target.appId, target.instanceId);
  } else if (target?.appId) {
    intentListeners = runtime.getIntentListenersByAppId(intent, target.appId);
  } else if (target?.name) {
    intentListeners = runtime.getIntentListenersByAppName(intent, target.name);
  } else {
    intentListeners = runtime.getIntentListeners(intent);
  }

  if (intentListeners.size > 0) {
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
      addView = addView && matchIntentAndContext(view?.config?.directoryData);

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

  // add in any running apps that might not have registered intent listeners
  // yet but have declared that they will handle a given intent
  Array.from(runtime.getViews().values())
    .filter(v => v.config?.directoryData)
    .filter(v => matchIntentAndContext(v.config?.directoryData))
    .filter(v => matchTarget(v))
    .filter(v => results.map(d => d.details.instanceId).indexOf(v.id) == -1)
    .map(v => {
      return {
        type: 'pending',
        details: {
          instanceId: v.id,
          directoryData: v.directoryData,
        }
      }
    })
    .forEach(a => results.push(a));
}

function collectDirectoryIntentResults(message: FDC3Message, results: Array<FDC3App>) {
  const data = message.data as RaiseIntentData;
  const runtime = getRuntime();
  const target = data.target as SailTargetIdentifier | undefined;
  const intent = data.intent;
  const intentContext = data.context?.type || '';

  if (target?.instanceId == null) {
    //pull intent handlers from the directory
    const directoryData: Array<DirectoryApp> = runtime
      .getDirectory()
      .retrieveByIntentContextAndResultType(intent, intentContext, null);

    directoryData.forEach((entry: DirectoryApp) => {
      let addResult = true;
      if ((target && entry.name !== target.name) && (target && entry.appId !== target.appId)) {
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
}

async function intentHandledByOpenAppPending(theApp: FDC3App, message: FDC3Message): Promise<SailIntentResolution> {
  const data: RaiseIntentData = message.data as RaiseIntentData;
  const appDetails = theApp.details;
  const runtime = getRuntime();
  const intentTarget = appDetails?.instanceId!!
  const view = runtime.getView(intentTarget);
 
  const resultId = getRuntime().initIntentResult(message.source);
  const intent = data.intent;

  //set pending intent for the view..
  if (view) {
    view.setPendingIntent(
      intent,
      data.context || undefined,
      message.source,
      resultId
    );

    return {
      source: {
        name: view.config?.directoryData?.name,
        appId: view.config?.directoryData?.appId,
        instanceId: view.id
      },
      version: data.fdc3Version,
      intent: data.intent,
      result: resultId,
      openingResolver: false
    };
  } else {
    // shouldn't occur, would mean runtime is inconsistent
    throw Error(AppNotFound)
  }
}

async function intentHandledByOpenAppHandler(theApp: FDC3App, message: FDC3Message): Promise<SailIntentResolution> {
  //if it is an existing view, post a message directly to it
  const data: RaiseIntentData = message.data as RaiseIntentData;
  const appDetails = theApp.details;
  const runtime = getRuntime();
  const intentTarget = appDetails?.instanceId!!
  const view = runtime.getView(intentTarget);

  if (view) {
    const resultId = runtime.initIntentResult(message.source);

    view.content.webContents.send(FDC3_TOPICS.INTENT, {
      topic: 'intent',
      data: message.data,
      source: message.source,
      result: resultId
    });

    return {
      source: {
        name: view.directoryData?.name,
        appId: view.directoryData?.appId,
        instanceId: view.id
      },
      intent: data.intent,
      version: view.fdc3Version,
      result: resultId,
      openingResolver: false
    };
  } else {
    // shouldn't occur, would mean runtime is inconsistent
    throw Error(AppNotFound)
  }
}

async function intentHandledByAppLaunch(theApp: FDC3App, message: FDC3Message): Promise<SailIntentResolution> {
  //if it is a directory entry resolve the destination for the intent and launch it
  const data: RaiseIntentData = message.data as RaiseIntentData;
  const appDetails = theApp.details;
  const directoryData = appDetails.directoryData!!;
  const directoryDetails = directoryData.details as DirectoryAppLaunchDetailsWeb;
  const start_url = directoryDetails.url;
  const intent = data.intent;

  const pending = true;

  const view = await getRuntime().createView(start_url, {
    directoryData: directoryData,
  });

  const resultId = getRuntime().initIntentResult(message.source);

  //set pending intent for the view..
  if (view && pending) {
    view.setPendingIntent(
      intent,
      data.context || undefined,
      message.source,
      resultId
    );
  }

  return {
    source: {
      name: directoryData.name,
      appId: directoryData.appId,
      instanceId: view.id
    },
    version: data.fdc3Version,
    intent: data.intent,
    result: resultId,
    openingResolver: false
  };
}

async function intentHandledByResolver(results: Array<FDC3App>, message: FDC3Message): Promise<SailIntentResolution> {
  //launch window with resolver UI
  const data: RaiseIntentData = message.data as RaiseIntentData;
  const intent = data.intent;
  results.sort(sortApps);

  const sourceView = getRuntime().getView(message.source);

  if (sourceView) {
    getRuntime().openResolver(
      {
        intent: intent,
        context: data.context,
      },
      sourceView,
      results,
    );
    return {
      version: data.fdc3Version,
      intent: data.intent,
      openingResolver: true,
      result: getRuntime().initIntentResult(message.source)
    }
  } else {
    throw new Error(ResolverUnavailable)
  }

}

export const raiseIntent = async (message: FDC3Message): Promise<SailIntentResolution> => {
  const results: Array<FDC3App> = [];
  const data: RaiseIntentData = message.data as RaiseIntentData;
  const intent = data.intent;

  if (!intent) {
    throw new Error(NoAppsFound);
  }

  collectRunningIntentResults(message, results);
  collectDirectoryIntentResults(message, results);

  if (results.length === 1) {
    const theApp = results[0];
    if (theApp.type === 'pending') {
      return intentHandledByOpenAppPending(theApp, message);
    } else if (theApp.type === 'window') {
      return intentHandledByOpenAppHandler(theApp, message);
    } else {
      return intentHandledByAppLaunch(theApp, message);
    }
  } else if (results.length > 0) {
    return intentHandledByResolver(results, message);
  } else {
    throw new Error(NoAppsFound);
  }
};

export const raiseIntentForContext = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const sourceView = runtime.getView(message.source);
  const data: RaiseIntentContextData = message.data as RaiseIntentContextData;

  const sourceName =
    sourceView && sourceView.directoryData
      ? sourceView.directoryData.name
      : 'unknown';

  const r: Array<FDC3App> = [];

  const contextType = data.context.type || null;

  //throw errror if no context
  if (!contextType) {
    throw new Error(NoAppsFound);
  }
  /**
   * To Do: Support additional AppMetadata searching (other than name)
   */
  const target = data.target?.appId ?? data.target?.name ?? null;

  const intentListeners = runtime.getIntentListenersByContext(contextType);

  if (intentListeners) {
    // let keys = Object.keys(intentListeners);
    intentListeners.forEach((listeners: Array<View>, intent) => {
      let addListener = true;
      //look up the details of the window and directory metadata in the "connected" store
      listeners.forEach((view: View) => {
        if (target && target !== view.directoryData?.name) {
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
          r.push({
            type: 'window',
            details: details,
            intent: intent,
          });
        }
      });
    });
  }

  const directoryData = getRuntime()
    .getDirectory()
    .retrieveByContextType(contextType);

  directoryData.forEach((entry: DirectoryApp) => {
    if (!target || (target && entry.name === target)) {
      r.push({ type: 'directory', details: { directoryData: entry } });
    }
  });

  if (r.length > 0) {
    if (r.length === 1) {
      //if there is only one result, use that
      //if it is a window, post a message directly to it
      //if it is a directory entry resolve the destination for the intent and launch it
      //dedupe window and directory items
      const result = r[0];
      //get the intent(s) for the item.
      //this will either be on the directory or listeners
      //To do: there may be multiple intent for the entry, in which case, we may hand off more resolution to the end user
      let intents: string[] = [];
      if (
        result.type === 'directory' &&
        result.details.directoryData?.interop?.intents?.listensFor
      ) {
        intents = Object.keys(
          result.details.directoryData?.interop?.intents?.listensFor,
        );
      } else if (result.type === 'window' && result.intent) {
        intents.push(result.intent);
      }
      //if there aren't any intents, just send context
      if (intents.length === 0) {
        if (result.type === 'window' && result.details.instanceId) {
          const view = runtime.getView(result.details.instanceId);
          if (view) {
            const topic = FDC3_TOPICS.CONTEXT;
            view.content.webContents.send(topic, {
              topic: 'context',
              data: {
                context: data.context,
              },
              source: message.source,
            });
          }
        } else if (
          result.type === 'directory' &&
          result.details.directoryData
        ) {
          const start_url = (
            result.details.directoryData.details as DirectoryAppLaunchDetailsWeb
          ).url;

          //let win = window.open(start_url,"_blank");
          const workspace = getRuntime().createWorkspace();

          const view = await workspace.createView(start_url, {
            directoryData: result.details.directoryData,
          });
          //view.directoryData = r[0].details.directoryData;
          //set pending context for the view..

          view.setPendingContext(data.context, message.source);

          return {
            source: {
              name: result.details.directoryData.name,
              appId: result.details.directoryData.appId,
            },
            version: '1.2',
          };
        }
      }
      //there is a known intent
      else {
        const intent = intents[0];
        //existing window?
        if (result.type === 'window' && result.details.instanceId) {
          const view = runtime.getView(result.details.instanceId);
          if (view) {
            const topic = FDC3_TOPICS.INTENT;
            view.content.webContents.send(topic, {
              topic: 'intent',
              data: {
                intent: intent,
                context: data.context,
              },
              source: message.source,
            });

            return { source: message.source, version: '1.2' };
          } else {
            //return {error:ResolveError.NoAppsFound};
            throw new Error(NoAppsFound);
          }
        } else if (
          result.type === 'directory' &&
          result.details.directoryData
        ) {
          //or new view?
          const start_url = (
            result.details.directoryData.details as DirectoryAppLaunchDetailsWeb
          ).url;
          const pending = true;

          //let win = window.open(start_url,"_blank");
          const workspace = getRuntime().createWorkspace();

          const view = await workspace.createView(start_url, {
            directoryData: result.details.directoryData,
          });

          //set pending intent for the view..
          if (pending && intent) {
            view.setPendingIntent(intent, data.context, message.source);
          }

          return {
            source: { name: sourceName, appId: message.source },
            version: '1.2',
          };
        }
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
            { context: data.context },
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
    throw new Error(NoAppsFound);
  }
};
