import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { TargetApp, AppMetadata, OpenError } from 'fdc3-1.2';
import {
  DirectoryApp,
  DirectoryAppLaunchDetails,
  DirectoryAppLaunchDetailsWeb,
} from '/@/directory/directory';

function isWeb(
  details: DirectoryAppLaunchDetails,
): details is DirectoryAppLaunchDetailsWeb {
  return Object.hasOwn(details, 'url');
}
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

  const result = allResults ? allResults[0] : null;

  if (result && result.type == 'web') {
    //get target workspace
    const sourceView = runtime.getView(message.source);
    const work =
      runtime.getWorkspace(message.source) || (sourceView && sourceView.parent);
    const details = result.details as DirectoryAppLaunchDetails;
    if (isWeb(details)) {
      const newView =
        work && work.createView(details.url, { directoryData: result });

      //set provided context
      if (newView && message.data.context) {
        newView.setPendingContext(message.data.context, message.source);
      }
      return;
    }
  }
  throw OpenError.AppNotFound;
};
