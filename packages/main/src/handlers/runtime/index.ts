import { Runtime } from '/@/runtime';
import { RUNTIME_TOPICS } from './topics';

import {
  tabSelected,
  tabDragStart,
  newTab,
  tearOutTab,
  closeTab,
  dropTab,
} from './tabs';
import { openToolsMenu } from './toolbar';
import { fetchFromDirectory } from './directory';
import { pickChannel, joinChannel } from './channelPicker';
import { loadSearchResults } from './search';
import { resolveIntent } from '../fdc3/resolveIntent';

export const register = (runtime: Runtime) => {
  runtime.addHandler(RUNTIME_TOPICS.TAB_SELECTED, tabSelected);
  runtime.addHandler(RUNTIME_TOPICS.TAB_DRAG_START, tabDragStart);
  runtime.addHandler(RUNTIME_TOPICS.DROP_TAB, dropTab);
  runtime.addHandler(RUNTIME_TOPICS.NEW_TAB, newTab);
  runtime.addHandler(RUNTIME_TOPICS.TEAR_OUT_TAB, tearOutTab);
  runtime.addHandler(RUNTIME_TOPICS.CLOSE_TAB, closeTab);
  runtime.addHandler(RUNTIME_TOPICS.FETCH_FROM_DIRECTORY, fetchFromDirectory);
  runtime.addHandler(RUNTIME_TOPICS.OPEN_TOOLS_MENU, openToolsMenu);
  runtime.addHandler(RUNTIME_TOPICS.OPEN_CHANNEL_PICKER, pickChannel);
  runtime.addHandler(RUNTIME_TOPICS.JOIN_WORKSPACE_TO_CHANNEL, joinChannel);
  runtime.addHandler(RUNTIME_TOPICS.SEARCH_LOAD_RESULTS, loadSearchResults);
  runtime.addHandler(RUNTIME_TOPICS.RES_RESOLVE_INTENT, resolveIntent);
};
