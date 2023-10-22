import { getRuntime } from '/@/index';
import { shell } from 'electron';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { AppIdentifier, OpenError } from '@finos/fdc3';
import { openApp } from '../lib/open';
import { OpenData } from '/@/types/FDC3Message';
import { DirectoryApp } from '/@/directory/directory';
import { OPEN_TARGETS } from '/@/constants';

export const open = async (message: RuntimeMessage) => {
  console.log('open', message);
  const runtime = getRuntime();
  const appIdentifier: AppIdentifier = message.data.target.appIdentifier;
  const data: OpenData = message.data as OpenData;

  const result: DirectoryApp[] = runtime
    .getDirectory()
    .retrieveByAppId(appIdentifier.appId);
  //handle special targets
  if (appIdentifier.appId.startsWith(OPEN_TARGETS.SAIL_TARGET_PREFIX)) {
    switch (appIdentifier.appId) {
      case OPEN_TARGETS.SAIL_TARGET_DEFAULT_BROWSER:
        shell.openExternal(data.context?.id?.url);
        break;
    }
    return;
  } else if (result.length > 0) {
    const directoryEntry: DirectoryApp = result[0];
    return await openApp(directoryEntry, message.source, data.context);
  }
  throw new Error(OpenError.AppNotFound);
};
