import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { AppIdentifier, OpenError } from '@finos/fdc3';
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
    const start_url = (result[0].details as DirectoryAppLaunchDetailsWeb).url;
    //get target workspace
    const sourceView = runtime.getView(message.source);
    const work =
      runtime.getWorkspace(message.source) || (sourceView && sourceView.parent);
    const newView =
      work && work.createView(start_url, { directoryData: result[0] });

    //set provided context
    if (newView && message.data.context) {
      newView.setPendingContext(message.data.context, message.source);
    }
    return;
  }
  throw OpenError.AppNotFound;
};
