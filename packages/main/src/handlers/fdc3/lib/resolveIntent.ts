import { getRuntime } from '/@/index';
import { View } from '/@/view';
import { FDC3App, IntentInstance } from '/@/types/FDC3Data';
import { FDC3Message, ResolveIntentData } from '/@/types/FDC3Message';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';
import { FDC3_TOPICS } from '../topics';
import { FDC3_2_0_TOPICS } from '../2.0/topics';

export const resolveIntent = async (message: FDC3Message) => {
  const runtime = getRuntime();
  let view: View | undefined;
  const data: ResolveIntentData = message.data as ResolveIntentData;
  const selected = data.selected;
  //TODO: autojoin the new app to the channel which the 'open' call is sourced from

  if (!selected.details.instanceId) {
    const directoryData: DirectoryApp = selected.details
      .directoryData as DirectoryApp;

    //launch window
    const runtime = getRuntime();
    const win = runtime.createWorkspace();
    view = await win.createView(
      (directoryData.details as DirectoryAppLaunchDetailsWeb).url,
      {
        directoryData: directoryData,
      },
    );

    //set pending intent and context
    view.setPendingIntent(data.intent, data.context, message.source);
  } else {
    view = runtime.getView(selected.details.instanceId);
    //send new intent
    if (view && view.parent) {
      view.content.webContents.send(FDC3_TOPICS.INTENT, {
        topic: 'intent',
        data: { intent: data.intent, context: data.context },
        source: message.source,
      });

      view.parent.setSelectedTab(view.id);
      
    }
  }
  //send the resolution to the source
  const resolver = runtime.getResolver();

  //close the resolver

  if (resolver) {
    const sourceView = runtime.getView(resolver?.source);
    if (sourceView) {
      const topic = FDC3_2_0_TOPICS.RESOLVE_INTENT
        
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
export const buildIntentInstanceTree = (
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

export const getAppTitle = (app: FDC3App): string => {
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

export const sortApps = (a: FDC3App, b: FDC3App): number => {
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
