import { getRuntime } from '/@/index';
import { View } from '/@/view';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';
import { getSailManifest } from '/@/directory/directory';
import { Context, FDC3Message, OpenData } from '/@/types/FDC3Message';
import { AppNotFound } from '/@/types/FDC3Errors';

export const openApp = async (
  app: DirectoryApp,
  source: string,
  context?: Context,
) => {
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
      work && (await work.createView(start_url, { directoryData: app }));
  }

  //set provided context
  if (newView && context) {
    newView.setPendingContext(context, source);
  }
  return;
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
  } else if (targetIdentifier.key) {
    allResults = runtime.getDirectory().retrieveByAppId(targetIdentifier.key);
  }

  if (allResults.length > 0) {
    // this deals with the case of multiple apps having the same name, appId etc.
    // TODO: if there's more than one, should this be an error?
    const directoryEntry: DirectoryApp = allResults[0];
    return await openApp(directoryEntry, message.source, data.context);
  }
  throw new Error(AppNotFound);
};
