import { ResolveError, AppIdentifier, ResultError } from '@finos/fdc3';
import { getRuntime } from '/@/index';
import { View } from '/@/view';
import {
  FDC3Message,
  RaiseIntentData,
  RaiseIntentContextData,
  IntentResultData,
  TargetIdentifier,
} from '/@/types/FDC3Message';
import { FDC3App, FDC3AppDetail } from '/@/types/FDC3Data';
import { FDC3_2_0_TOPICS } from './topics';
import { FDC3_1_2_TOPICS } from '/@/handlers/fdc3/1.2/topics';

import { buildIntentInstanceTree, sortApps } from '../lib/raiseIntent';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';

//convert the version agnostic TargetIdentifier type to an AppIndentifier type
const targetToIdentifier = (
  target?: TargetIdentifier,
): AppIdentifier | undefined => {
  if (!target) {
    return undefined;
  }
  return {
    appId: target.appId || target.key,
    instanceId: target.appIdentifier?.instanceId,
  };
};

export const raiseIntent = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const r: Array<FDC3App> = [];
  const messageData: RaiseIntentData = message.data as RaiseIntentData;
  const intent = messageData.intent;

  if (!intent) {
    throw new Error(ResolveError.NoAppsFound);
  }

  //only support string targets for now...
  const target = targetToIdentifier(messageData.target);

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
  if (message.data && messageData.context) {
    ctx = messageData.context.type;
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
      //create a nonce for the intentResult
      const resultId = runtime.initIntentResult();
      //if there is only one result, use that
      //if it is an existing view, post a message directly to it
      //if it is a directory entry resolve the destination for the intent and launch it
      //dedupe window and directory items
      if (theApp.type === 'window' && appDetails?.instanceId) {
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
              resultId: resultId,
            });
          }

          return {
            source: { name: view.directoryData?.name, appId: message.source },
            version: '2.0',
            resultId: resultId,
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
        //view.directoryData = r[0].details.directoryData;
        //set pending intent for the view..
        if (view && pending) {
          view.setPendingIntent(
            intent,
            messageData.context,
            message.source,
            resultId,
          );
        }

        console.log('**************** returning raiseIntent', resultId);
        return {
          source: { name: sourceName, appId: message.source },
          version: '2.0',
          resultId: resultId,
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

      //launch window with resolver UI
      // console.log('resolve intent - options', r);
      const sourceView = getRuntime().getView(message.source);
      if (sourceView) {
        getRuntime().openResolver(
          {
            intent: intent,
            context: messageData.context,
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

export const getIntentResult = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const messageData: IntentResultData = message.data as IntentResultData;
  const result = runtime.getIntentResult(messageData.resultId);
  console.log('**************** gotintent result', result);
  return ResultError;
};

export const setIntentResult = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const messageData: IntentResultData = message.data as IntentResultData;
  console.log(
    '**************** set intent result',
    messageData.resultId,
    messageData.result,
  );

  runtime.setIntentResult(messageData.resultId, messageData.result || null);
  return;
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
    throw new Error(ResolveError.NoAppsFound);
  }

  const target = targetToIdentifier(data.target);

  const intentListeners = runtime.getIntentListenersByContext(contextType);

  if (intentListeners) {
    // let keys = Object.keys(intentListeners);
    intentListeners.forEach((listeners: Array<View>, intent) => {
      let addListener = true;
      //look up the details of the window and directory metadata in the "connected" store
      listeners.forEach((view: View) => {
        if (target && target.appId !== view.directoryData?.appId) {
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
    if (!target || (target && entry.appId === target.appId)) {
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
      const resultId = runtime.initIntentResult();
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
            const topic =
              view.fdc3Version === '1.2'
                ? FDC3_1_2_TOPICS.CONTEXT
                : FDC3_2_0_TOPICS.CONTEXT;
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
            version: '2.0',
            resultId: resultId,
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
            const topic =
              view.fdc3Version === '1.2'
                ? FDC3_1_2_TOPICS.INTENT
                : FDC3_2_0_TOPICS.INTENT;

            view.content.webContents.send(topic, {
              topic: 'intent',
              data: {
                intent: intent,
                context: data.context,
              },
              source: message.source,
              resultId: resultId,
            });

            return {
              source: message.source,
              version: '2.0',
              resultId: resultId,
            };
          } else {
            //return {error:ResolveError.NoAppsFound};
            throw new Error(ResolveError.NoAppsFound);
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
            view.setPendingIntent(
              intent,
              data.context,
              message.source,
              resultId,
            );
          }

          return {
            source: { name: sourceName, appId: message.source },
            version: '2.0',
            resultId: resultId,
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
    throw new Error(ResolveError.NoAppsFound);
  }
};
