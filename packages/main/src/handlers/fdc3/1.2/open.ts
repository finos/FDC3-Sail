import { getRuntime } from '/@/index';
import { View } from '/@/view';
import { OpenError } from 'fdc3-1.2';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';
import { getSailManifest } from '/@/directory/directory';
import { FDC3Message, OpenData, TargetIdentifier } from '/@/types/FDC3Message';

/**
 *
 * @param target
 * Given a TargetApp input, return the app Name or undefined
 */
const resolveTargetAppToName = (target: TargetIdentifier): string => {
  if (target.name) {
    return target.name;
  }
  return target.key;
};

export const open = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: OpenData = message.data as OpenData;

  const name = resolveTargetAppToName(data.target);

  const allResults: DirectoryApp[] =
    name !== ''
      ? runtime.getDirectory().retrieveByName(name)
      : runtime.getDirectory().retrieveAll();

  if (allResults.length > 0) {
    const directoryEntry: DirectoryApp = allResults[0];
    const start_url = (directoryEntry.details as DirectoryAppLaunchDetailsWeb)
      .url;
    const manifest = getSailManifest(directoryEntry);

    let newView: View | void;

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
        work &&
        (await work.createView(start_url, { directoryData: directoryEntry }));
    }

    //set provided context
    if (newView && data.context) {
      newView.setPendingContext(data.context, message.source);
    }

    return;
  }
  throw new Error(OpenError.AppNotFound);
};
