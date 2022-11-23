import { getRuntime } from '/@/index';
import { View } from '/@/view';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { TargetApp, AppMetadata, OpenError } from 'fdc3-1.2';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';
import { getSailManifest } from '/@/directory/directory';

/**
 *
 * @param target
 * Given a TargetApp input, return the app Name or undefined
 */
const resolveTargetAppToName = (target: TargetApp): string | undefined => {
  if (!target) {
    return undefined;
  }
  let name = undefined;
  //is target typeof string?  if so, it is just going to be an app name
  if (typeof target === 'string') {
    name = target;
  } else {
    const app: AppMetadata = target as AppMetadata;
    if (app && app.name) {
      name = app.name;
    }
  }
  return name;
};

export const open = async (message: RuntimeMessage) => {
  console.log('open', message);
  const runtime = getRuntime();
  const name =
    message.data && message.data.name
      ? message.data.name
      : message.data && message.data.target
      ? resolveTargetAppToName(message.data.target)
      : '';

  const allResults: DirectoryApp[] =
    name != ''
      ? runtime.getDirectory().retrieveByName(name)
      : runtime.getDirectory().retrieveAll();

  if (allResults.length > 0) {
    const directoryEntry: DirectoryApp = allResults[0];
    const start_url = (directoryEntry.details as DirectoryAppLaunchDetailsWeb)
      .url;
    const manifest = getSailManifest(directoryEntry);

    let newView: View | undefined;

    //if manifest is set to force a new window, then launch a new workspace
    if (manifest.forceNewWindow && manifest.forceNewWindow === true) {
      newView = await runtime.createView(start_url, {
        directoryData: directoryEntry,
      });
    } else {
      //else get target workspace
      const sourceView = runtime.getView(message.source);
      const work =
        runtime.getWorkspace(message.source) ||
        (sourceView && sourceView.parent);
      newView =
        work && work.createView(start_url, { directoryData: directoryEntry });
    }

    //set provided context
    if (newView && message.data.context) {
      newView.setPendingContext(message.data.context, message.source);
    }
    return;
  }
  throw new Error(OpenError.AppNotFound);
};
