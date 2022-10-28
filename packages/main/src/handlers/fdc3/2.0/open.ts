import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { DirectoryApp } from '/@/types/FDC3Data';
import { AppIdentifier, OpenError } from '@finos/fdc3';

export const open = async (message: RuntimeMessage) => {
  console.log('open', message);
  const runtime = getRuntime();
  const appIdentifier: AppIdentifier = message.data.appIdentifier;

  const result: DirectoryApp = (await runtime.fetchFromDirectory(
    `/apps${typeof appIdentifier === 'string' ? '/' + appIdentifier : ''}`,
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
