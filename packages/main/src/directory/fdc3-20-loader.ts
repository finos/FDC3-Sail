import { readFile } from 'fs/promises';
import { DirectoryApp, Loader } from './directory';
import fetch from 'electron-fetch';
import { components } from './generated-schema';

/**
 * Replace this with the actual definitoo
 */
type schemas = components['schemas'];
export type AllApplicationsResponse = schemas['AllApplicationsResponse'];

const convertToDirectoryList = (data: AllApplicationsResponse) =>
  data.applications as DirectoryApp[];
const convertSingleApp = (data: DirectoryApp) => [data] as DirectoryApp[];

export function loadRemotely(u: string) {
  return fetch(u).then((response) => response.json());
}

export function loadLocally(u: string) {
  return readFile(u)
    .then((buf) => buf.toString('utf8'))
    .then((data) => JSON.parse(data));
}

/**
 * Load data in FDC3 2.0 Directory format.  Here, we make the assumption
 * that the data is formatted correctly.
 */
export const fdc3_2_0_AppDirectoryLoader: Loader = (u: string) => {
  let converter;

  if (u.endsWith('/v2/apps') || u.endsWith('/v2/apps/')) {
    // whole directory
    converter = convertToDirectoryList;
  } else if (u.includes('/v2/apps')) {
    // single app
    converter = convertSingleApp;
  } else {
    // not handled by this loader
    return new Promise((resolve) => {
      resolve([]);
    });
  }

  if (u.startsWith('http')) {
    return loadRemotely(u).then(converter);
  } else {
    return loadLocally(u).then(converter);
  }
};
