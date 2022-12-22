import { getRuntime } from '/@/index';
import { OpenError } from 'fdc3-1.2';
import { DirectoryApp } from '/@/directory/directory';
import { FDC3Message, OpenData, TargetIdentifier } from '/@/types/FDC3Message';
import { openApp } from '../lib/open';

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
    return await openApp(directoryEntry, message.source, data.context);
  }
  throw new Error(OpenError.AppNotFound);
};
