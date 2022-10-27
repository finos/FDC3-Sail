import { DirectoryApp } from '../types/FDC3Data';
//import { DirectoryApp as OldDirectoryApp, DirectoryIcon as OldIcon } from "../handlers/fdc3/1.2/types/FDC3Data";
import { readFile } from 'fs/promises';

// function convertAppEntryTo2_0(record: object) : DirectoryApp {
//     const o = record as OldDirectoryApp

//     return {
//         appId: o.appId,
//         name: o.name,
//         title: o.title,
//         description: o.description,
//         icons: null,

//     } as DirectoryApp
// }

const convertToDirectoryList = (data: unknown) => data as DirectoryApp[];
const convertSingleApp = (data: unknown) => [data] as DirectoryApp[];

/**
 * Load data in FDC3 1.x Directory format.
 */
export function fdc3AppDirectoryLoader(u: string): Promise<DirectoryApp[]> {
  let converter;
  console.log('IN: ' + process.cwd());

  if (u.endsWith('/v1/apps') || u.endsWith('/v1/apps/')) {
    // whole directory
    converter = convertToDirectoryList;
  } else if (u.endsWith('.json') || u.includes('/v1/apps')) {
    // single app
    converter = convertSingleApp;
  } else {
    // not handled by this loader
    return new Promise((resolve) => {
      resolve([]);
    });
  }

  if (u.startsWith('http')) {
    return loadRemotely().then(converter);
  } else {
    return loadLocally().then(converter);
  }

  function loadRemotely() {
    return fetch(u).then((response) => response.json());
  }

  function loadLocally() {
    return readFile(u)
      .then((buf) => buf.toString('utf8'))
      .then((data) => JSON.parse(data));
  }
}
