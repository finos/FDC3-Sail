import { expect, test } from 'vitest';
import { fdc3_2_0_AppDirectoryLoader } from '../src/directory/fdc3-20-loader';
import { fdc3_1_2_AppDirectoryLoader } from '../src/directory/fdc3-12-loader';
import { Directory, DirectoryApp } from '../src/directory/directory';

const REMOTE_V2 = 'https://directory.fdc3.finos.org/v2/apps';
const LOCAL_V2 = 'tests/v2/apps/appd-record.v2.json';
const LOCAL_V1 = 'tests/v1/apps/appd-record.v1.json';

test('Test Remote Directory Load in FDC3 2.0 Format', async () => {
  const results = await fdc3_2_0_AppDirectoryLoader(REMOTE_V2);
  expect(results.length).toBeGreaterThan(3);
});

test('Test Single App Load in FDC3 2.0 Format', async () => {
  const results = await fdc3_2_0_AppDirectoryLoader(
    'https://directory.fdc3.finos.org/v2/apps/fdc3-workbench/',
  );
  expect(results.length).toEqual(1);
  expect(results[0].appId).toEqual('fdc3-workbench');
});

test('Test Local App Load in FDC3 2.0 Format', async () => {
  const results = await fdc3_2_0_AppDirectoryLoader(LOCAL_V2);
  expect(results.length).toEqual(1);
  expect(results[0].appId).toEqual('my-application');
});

test('Test Local App Load in FDC3 1.2 Format', async () => {
  const results = await fdc3_1_2_AppDirectoryLoader(LOCAL_V1);
  expect(results.length).toEqual(1);
  expect(results[0].appId).toEqual('News-Demo');
});

test('Test Returned Intents', async () => {
  const directory = new Directory(
    [LOCAL_V2, LOCAL_V1],
    [fdc3_2_0_AppDirectoryLoader, fdc3_1_2_AppDirectoryLoader],
  );
  await directory.reload();
  expect(directory.retrieveAll().length).toEqual(2);

  // retrieve by intent only
  const matchedApps: DirectoryApp[] =
    directory.retrieveByIntentAndContextType('ViewNews');
  expect(matchedApps.length).toEqual(1);
  const listensFor = matchedApps[0]?.interop?.intents?.listensFor as any;
  const intent = listensFor['ViewNews'][0];
  expect(intent?.displayName).toEqual('View News');
  expect(intent?.contexts).toContain('fdc3.instrument');

  // retrieve by intent and context
  const matchedApps2 = directory.retrieveByIntentAndContextType(
    'ViewNews',
    'fdc3.instrument',
  );
  expect(matchedApps2.length).toEqual(1);
});
