import { getRuntime } from '/@/index';
import { View } from '/@/view';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { AppIdentifier, OpenError } from '@finos/fdc3';
import { getSailManifest } from '/@/directory/directory';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';

export const open = async (message: RuntimeMessage) => {
  console.log('open', message);
  const runtime = getRuntime();
  const appIdentifier: AppIdentifier = message.data.appIdentifier;

  const result: DirectoryApp[] = runtime
    .getDirectory()
    .retrieveByAppId(appIdentifier.appId);

  if (result.length > 0) {
    const directoryEntry: DirectoryApp = result[0];
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
