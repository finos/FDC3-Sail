import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { TargetApp, AppMetadata, OpenError } from '@finos/fdc3';
import { DirectoryApp } from '/@/types/FDC3Data';

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
  const runtime = getRuntime();
  const name =
    message.data && message.data.name
      ? message.data.name
      : message.data && message.data.target
      ? resolveTargetAppToName(message.data.target)
      : '';

  const result: DirectoryApp = (await runtime.fetchFromDirectory(
    `/apps/${name}`,
  )) as DirectoryApp;
  if (result && result.start_url) {
    //get target workspace
    const sourceView = runtime.getView(message.source);
    const work =
      runtime.getWorkspace(message.source) || (sourceView && sourceView.parent);
    const newView =
      work && work.createView(result.start_url, { directoryData: result });

    //set provided context
    if (newView && message.data.context) {
      newView.setPendingContext(message.data.context, message.source);
    }
    return;
  }
  throw OpenError.AppNotFound;
};
