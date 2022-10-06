import { getRuntime } from '../../index';
import { RuntimeMessage } from '../runtimeMessage';

export const hideSearchResults = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  //bring selected browserview to front
  const workspace = runtime?.getWorkspace(message.source);
  workspace?.hideSearchResults();
};

export const loadSearchResults = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  //bring selected browserview to front
  console.log('loadSearchResults', message.data.results);
  const workspace = runtime?.getWorkspace(message.source);
  workspace?.loadSearchResults(message.data.results);
};
