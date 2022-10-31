import {
  DirectoryApp,
  DirectoryAppLaunchDetailsWeb,
  DirectoryIcon,
  DirectoryIntent,
  DirectoryScreenshot,
  Loader,
} from './directory';
import { loadLocally, loadRemotely } from './fdc3-20-loader';

import { components } from './generated-schema';

/**
 * Replace this with the actual definition
 */
type schemas = components['schemas'];
export type DirectoryAppV1 = schemas['ApplicationV1'];
export type DirectoryIconV1 = schemas['IconV1'];
export type DirectoryIntentV1 = schemas['IntentV1'];
export type AllApplicationsResponseV1 = schemas['ApplicationSearchResponseV1'];

const convertToDirectoryList = (data: AllApplicationsResponseV1) =>
  data.applications?.map((a) => convertApp(a)) as DirectoryApp[];

const convertSingleApp = (data: DirectoryAppV1) =>
  [convertApp(data)] as DirectoryApp[];

function convertIntents(intents: DirectoryIntentV1[]): {
  [key: string]: DirectoryIntent[];
} {
  const out: { [index: string]: DirectoryIntent[] } = {};
  intents.forEach((i) => {
    const displayName = i.displayName ?? i.name;
    const key = i.name;
    const intent = {
      contexts: i.contexts ?? [],
      displayName: displayName,
    } as DirectoryIntent;

    if (out[key]) {
      out[key].push(intent);
    } else {
      out[key] = [intent];
    }
  });

  return out;
}

function convertScreenshots(d: DirectoryAppV1): DirectoryScreenshot[] {
  return (
    d.images?.map((e) => {
      return {
        src: e.url,
      } as DirectoryScreenshot;
    }) ?? []
  );
}

function convertIcons(d: DirectoryAppV1): DirectoryIcon[] {
  return (
    d.icons?.map((e) => {
      return {
        src: e.icon,
      } as DirectoryIcon;
    }) ?? []
  );
}

function convertDetails(d: DirectoryAppV1): DirectoryAppLaunchDetailsWeb {
  return {
    url: (d as any)['start_url'],
  };
}

function convertApp(d: DirectoryAppV1): DirectoryApp {
  return {
    appId: d.appId,
    name: d.name,
    title: d.title,
    description: d.description,
    type: 'web', // hard-coded to only load these
    icons: convertIcons(d),
    screenshots: convertScreenshots(d),
    details: convertDetails(d),
    interop: {
      intents: {
        listensFor: convertIntents(d.intents ?? []),
      },
    },
  };
}

/**
 * Load data in FDC3 1.2 Directory format.  Here, we make the assumption
 * that the data is formatted correctly.
 */
export const fdc3_1_2_AppDirectoryLoader: Loader = (u: string) => {
  let converter;

  if (u.endsWith('/v1/apps') || u.endsWith('/v1/apps/')) {
    // whole directory
    converter = convertToDirectoryList;
  } else if (u.includes('/v1/apps')) {
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
