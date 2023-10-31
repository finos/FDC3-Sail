/**
 * shared functions and constants
 */

import { systemChannels } from '/@/handlers/fdc3/lib/systemChannels';
import { SailChannelData } from './types/FDC3Data';
import { FDC3EventDetail } from './types/FDC3Event';
import { randomUUID } from 'crypto';

export const guid = () => {
  return randomUUID();
};

const DEFAULT_DIRECTORY = 'https://directory.fdc3.finos.org/v2/apps';

const getDirectoryUrl = (): string => {
  const envVar = process.env['SAIL_DIRECTORY_URL'];
  const dir = envVar ? envVar : DEFAULT_DIRECTORY;
  console.log('SAIL_DIRECTORY_URL: ' + dir);
  return dir;
};

const getSystemChannels = (): Array<SailChannelData> => {
  return systemChannels;
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

export function now() {
  return new Date().getTime();
}

export function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export const NO_LISTENER_TIMEOUT = 20000; // 20 seconds
