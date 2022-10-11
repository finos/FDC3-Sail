/**
 * shared functions and constants
 */

import { channels } from './system-channels';
import { ConnectedApp, ChannelData } from './types/FDC3Data';
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

//connected end points / apps
const connected: Map<string, ConnectedApp> = new Map();

const getSystemChannels = (): Array<ChannelData> => {
  return channels;
};

/**
 * add a new tab to the collection of tracked tabs
 */
const setConnected = (item: ConnectedApp): boolean => {
  if (!connected.has(item.id)) {
    // (Seb) commented out to satisfy Static code analysis
    // console.log(`set connected id=${item.id} item=${item}`, connected);
    connected.set(item.id, item);
  }
  return true;
};

//if id is passed, return that item, if no or false args, return all connected items
const getConnected = (id: string): ConnectedApp | undefined => {
  return connected.get(id);
};

const dropConnected = (id: string) => {
  connected.delete(id);
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
  setConnected,
  getConnected,
  dropConnected,
  fdc3Event,
  isDataIntent,
};
