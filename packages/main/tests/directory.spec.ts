import { expect, test } from 'vitest';
import { fdc3_2_0_AppDirectoryLoader } from '../src/directory/fdc3-20-loader';
import {
  Directory,
  DirectoryApp,
  DirectoryIntent,
  getSailManifest,
} from '../src/directory/directory';
import { join } from 'path';

const PACKAGE_ROOT = __dirname;

const REMOTE_V2 = 'https://directory.fdc3.finos.org/v2/apps';

const LOCAL_V2 = join(PACKAGE_ROOT, '/v2/apps/appd-records.v2.json');
const LOCAL_V2_VIEW_NEWS = join(PACKAGE_ROOT, '/v2/apps/view-news.json');

test('Test Remote Directory Load in FDC3 2.0 Format', async () => {
  const results = await fdc3_2_0_AppDirectoryLoader(REMOTE_V2);
  expect(results.length).toBeGreaterThan(3);
});

test('Test Local App Load in FDC3 2.0 Format', async () => {
  const results = await fdc3_2_0_AppDirectoryLoader(LOCAL_V2);
  expect(results.length).toEqual(2);
  expect(results[0].appId).toEqual('my-application');
});

test('Test Returned Intents', async () => {
  const directory = new Directory(
    [LOCAL_V2, LOCAL_V2_VIEW_NEWS],
    [fdc3_2_0_AppDirectoryLoader],
  );
  await directory.reload();
  expect(directory.retrieveAll().length).toEqual(3);

  // retrieve by intent only
  const matchedApps: DirectoryApp[] =
    directory.retrieveByIntentContextAndResultType('ViewNews');
  expect(matchedApps.length).toEqual(1);
  expect(matchedApps[0].appId).toEqual('News-Demo');
  const listensFor = matchedApps[0]?.interop?.intents?.listensFor as {
    [key: string]: DirectoryIntent;
  };
  const intent = listensFor['ViewNews'];
  expect(intent?.displayName).toEqual('View News');
  expect(intent?.contexts).toContain('fdc3.instrument');

  // retrieve by intent and context
  const matchedApps2 = directory.retrieveByIntentContextAndResultType(
    'ViewChart',
    'fdc3.instrument',
  );
  expect(matchedApps2.length).toEqual(2);
  expect(matchedApps2[0].appId).toEqual('my-application');

  const listensFor2 = matchedApps2[0]?.interop?.intents?.listensFor as {
    [key: string]: DirectoryIntent;
  };
  const intent2 = listensFor2['ViewChart'];
  expect(intent2?.displayName).toEqual('View Chart');
  expect(intent2?.contexts).toContain('fdc3.instrument');
});

test('Full Text Search', async () => {
  const directory = new Directory(
    [LOCAL_V2, LOCAL_V2_VIEW_NEWS],
    [fdc3_2_0_AppDirectoryLoader],
  );

  await directory.reload();
  expect(directory.retrieveAll().length).toEqual(3);

  expect(directory.retrieveByQuery('Sasquatch').length).toEqual(0);
  expect(directory.retrieveByQuery('NewsAPI')[0].appId).toEqual('News-Demo');
  expect(directory.retrieveByQuery('FDC3 fully')[0].appId).toEqual(
    'my-application',
  );
});

test('Retrieve just intent data', async () => {
  const directory = new Directory(
    [LOCAL_V2, LOCAL_V2_VIEW_NEWS],
    [fdc3_2_0_AppDirectoryLoader],
  );

  await directory.reload();
  const intents1 = directory.retrieveAllIntents();
  expect(intents1['ViewNews']).toBeDefined();
  const intents2 = directory.retrieveAllIntentsByName('ViewNews');
  expect(intents2.length).toEqual(1);

  const intents3 = directory.retrieveAllIntentsByContext('fdc3.instrument');
  expect(Object.keys(intents3).length).toEqual(3);
  expect(Object.keys(intents3)).toEqual([
    'ViewChart',
    'myApp.GetPrice',
    'ViewNews',
  ]);
});

test('Ensure Manifests Set Correctly', async () => {
  const directory = new Directory(
    [LOCAL_V2, LOCAL_V2_VIEW_NEWS],
    [fdc3_2_0_AppDirectoryLoader],
  );
  await directory.reload();

  // test 1.2 manifest is set correctly
  const sailManifest1 = getSailManifest(
    directory.retrieveByAppId('News-Demo')[0],
  );
  expect(sailManifest1.injectApi).toEqual('1.2');
  expect(sailManifest1.searchable).toEqual(true);

  // test 2.0 defaulting
  const sailManifest2 = getSailManifest(
    directory.retrieveByAppId('my-application')[0],
  );
  expect(sailManifest2.injectApi).toEqual('2.0');
  expect(sailManifest2.searchable).toEqual(true);

  // test 2.0 defaulting
  const sailManifest2_2 = getSailManifest(
    directory.retrieveByAppId('my-nonsearchable-application')[0],
  );
  expect(sailManifest2_2.searchable).toEqual(false);
});
