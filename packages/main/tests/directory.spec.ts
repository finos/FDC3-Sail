import { expect, test } from 'vitest';
import { fdc3AppDirectoryLoader } from '../src/directory/fdc3-2_0-loaders';

test('Test Remote Directory Load in FDC3 2.0 Format', async () => {
  const results = await fdc3AppDirectoryLoader(
    'https://directory.fdc3.finos.org/v2/apps',
  );
  expect(results.length > 3, 'loaded several directory entries');
  console.log(JSON.stringify(results));
});

test('Test Single App Load in FDC3 2.0 Format', async () => {
  const results = await fdc3AppDirectoryLoader(
    'https://directory.fdc3.finos.org/v2/apps/fdc3-workbench/',
  );
  expect(results.length == 1, 'loaded single entry');
  expect(results[0].appId == 'fdc3-workbench');
});

test('Test Local App Load in FDC3 2.0 Format', async () => {
  const results = await fdc3AppDirectoryLoader('tests/single-appd-record.json');
  expect(results.length == 1, 'loaded single entry');
  expect(results[0].appId == 'fdc3-workbench');
});
