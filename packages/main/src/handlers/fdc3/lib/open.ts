import { getRuntime } from '/@/index';
import { View } from '/@/view';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';
import { getSailManifest } from '/@/directory/directory';
import { Context, FDC3Message, OpenData, SailTargetIdentifier } from '/@/types/FDC3Message';
import { AppNotFound, AppTimeout } from '/@/types/FDC3Errors';
import { NO_LISTENER_TIMEOUT, now, sleep } from '/@/utils';

export const openApp = async (
  app: DirectoryApp,
  source: string,
  context?: Context,
) : Promise<SailTargetIdentifier | void > => {
  const runtime = getRuntime();
  const start_url = (app.details as DirectoryAppLaunchDetailsWeb).url;
  const manifest = getSailManifest(app);

  let newView: View | void;

  //if manifest is set to force a new window, then launch a new workspace
  if (manifest.forceNewWindow && manifest.forceNewWindow === true) {
    newView = await runtime.createView(start_url, {
      directoryData: app,
    });
  } else {
    //else get target workspace
    const sourceView = runtime.getView(source);
    const work =
      runtime.getWorkspace(source) || (sourceView && sourceView.parent);
    newView =
      work && (work.createView(start_url, { directoryData: app }));
  }

  if (!newView) {
    return
  }

  const result = {
    name: app.name,
    appId: app.appId,
    instanceId: newView!!.id,
    appMetadata: app
  };  

  //set provided context
  if (context != undefined) {
    newView.setPendingContext(context, source);

    // make sure the app registers a listener for this context
    // before completing
    const startTime = now();
    while (now() - startTime < NO_LISTENER_TIMEOUT) {
      const found = newView.listeners
         .filter(l => (l.contextType == context.type) || (l.contextType == null));
      //console.log("Listeners: "+found.length)
      if (found.length > 0) {
        return result;
      } else {
        //console.log("Waiting...")
        await sleep(2);
      }
    }
    
    // console.log("Giving up")
    throw new Error(AppTimeout)
  } else {
    // for getAppMetadata.
    await sleep(200);
    return result;
  } 
};

export const open = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: OpenData = message.data as OpenData;
  const targetIdentifier = data.target;

  let allResults: DirectoryApp[] = [];

  if (targetIdentifier.name) {
    allResults = runtime.getDirectory().retrieveByName(targetIdentifier.name);
  } else if (targetIdentifier.appId) {
    allResults = runtime.getDirectory().retrieveByAppId(targetIdentifier.appId);
  } 

  if (allResults.length > 0) {
    // this deals with the case of multiple apps having the same name, appId etc.
    // TODO: if there's more than one, should this be an error?
    const directoryEntry: DirectoryApp = allResults[0];
    return await openApp(directoryEntry, message.source, data.context);
  }
  throw new Error(AppNotFound);
};
