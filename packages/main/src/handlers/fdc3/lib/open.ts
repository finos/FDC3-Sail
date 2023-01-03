import { getRuntime } from '/@/index';
import { View } from '/@/view';
import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';
import { getSailManifest } from '/@/directory/directory';
import { Context } from '@finos/fdc3';

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
