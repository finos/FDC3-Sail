/**
 * shared functions and constants
 */

import { channels } from './system-channels';
import { ChannelData } from './types/FDC3Data';
import { FDC3EventDetail } from './types/FDC3Event';
import { DirectoryPort } from '../../../directory/src/config';

const productionDirectory = 'https://appd.kolbito.com';

const getDirectoryUrl = (): Promise<string> => {
  return new Promise((resolve) => {
    const url: string =
      import.meta.env.DEV && import.meta.env.VITE_DEV_DIRECTORY_URL
        ? `${import.meta.env.VITE_DEV_DIRECTORY_URL}`
        : productionDirectory;

    if (url === 'local') {
      resolve(`http://localhost:${DirectoryPort}`);
    } else {
      resolve(url);
    }
  });
};

const getSystemChannels = (): Array<ChannelData> => {
  return channels;
};

/**
 * generates a CustomEvent for FDC3 eventing in the DOM
 * @param type
 * @param detail
 */
const fdc3Event = (type: string, detail: FDC3EventDetail): CustomEvent => {
  return new CustomEvent(`FDC3:${type}`, { detail: detail });
};

/**
 *
 * Temporary function to shim not having this metadata in the appD
 * if the intent is a data intent, then we won't bring it's tab to front when the intent  is resovled
 * @param intentName - name of the intent to check
 */
const isDataIntent = (intentName: string): boolean => {
  //list of known data intents (right now, this is just the genesis demo one)
  const dataIntents: Array<string> = ['genesis.FindFXPrice'];
  return dataIntents.includes(intentName);
};

export default {
  getDirectoryUrl,
  getSystemChannels,
  fdc3Event,
  isDataIntent,
};
