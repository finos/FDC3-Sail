import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { AppIdentifier, OpenError } from '@finos/fdc3';
import { openApp } from '../lib/open';
import { OpenData } from '/@/types/FDC3Message';
import { DirectoryApp } from '/@/directory/directory';

export const open = async (message: RuntimeMessage) => {
  console.log('open', message);
  const runtime = getRuntime();
  const appIdentifier: AppIdentifier = message.data.appIdentifier;
  const data: OpenData = message.data as OpenData;

  const result: DirectoryApp[] = runtime
    .getDirectory()
    .retrieveByAppId(appIdentifier.appId);

  if (result.length > 0) {
    const directoryEntry: DirectoryApp = result[0];
    return await openApp(directoryEntry, message.source, data.context);
  }
  throw new Error(OpenError.AppNotFound);
};
