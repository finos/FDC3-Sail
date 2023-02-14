import { readFile } from 'fs/promises';
import { DirectoryApp, DirectoryAppSailManifest, Loader } from './directory';
import fetch from 'electron-fetch';
import { components } from './generated-schema';

/**
 * Replace this with the actual definitoo
 */
type schemas = components['schemas'];
export type AllApplicationsResponse = schemas['AllApplicationsResponse'];

const convertToDirectoryList = (data: AllApplicationsResponse) =>
  data.applications?.map(applyDefaults) as DirectoryApp[];

function applyDefaults(d: DirectoryApp): DirectoryApp {
  // first, check manifest is set
  const hostManifests = d.hostManifests ?? {};
  if (!d.hostManifests) {
    d.hostManifests = hostManifests;
  }

  let sailManifest = hostManifests.sail;

  if (!sailManifest) {
    sailManifest = {};
    hostManifests.sail = sailManifest;
  }

  const typedManifest = sailManifest as DirectoryAppSailManifest;

  // check version
  if (typedManifest.injectApi === undefined) {
    typedManifest.injectApi = '2.0';
  }

  if (typedManifest['searchable'] === undefined) {
    typedManifest['searchable'] = true;
  }

  return d;
}

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

  if (u.endsWith('/v2/apps') || u.includes('.json')) {
    // whole directory
    converter = convertToDirectoryList;
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
