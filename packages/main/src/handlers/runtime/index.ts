import { getRuntime } from '../../index';
import {
  tabSelected,
  tabDragStart,
  newTab,
  tearOutTab,
  closeTab,
} from './tabs';
import { fetchFromDirectory } from './directory';

export const RUNTIME_TOPICS = {
  TAB_SELECTED: 'runtime:tabSelected',
  TAB_DRAG_START: 'runtime:tabDragStart',
  NEW_TAB: 'runtime:newTab',
  DROP_TAB: 'runtime:dropTab',
  TEAR_OUT_TAB: 'runtime:tearOutTab',
  CLOSE_TAB: 'runtime:closeTab',
  REMOVE_TAB: 'runtime:removeTab',
  FETCH_FROM_DIRECTORY: 'runtime:fetchFromDirectory',
};

export const register = () => {
  const runtime = getRuntime();

  runtime.addHandler(RUNTIME_TOPICS.TAB_SELECTED, tabSelected);
  runtime.addHandler(RUNTIME_TOPICS.TAB_DRAG_START, tabDragStart);
  runtime.addHandler(RUNTIME_TOPICS.NEW_TAB, newTab);
  runtime.addHandler(RUNTIME_TOPICS.TEAR_OUT_TAB, tearOutTab);
  runtime.addHandler(RUNTIME_TOPICS.CLOSE_TAB, closeTab);
  runtime.addHandler(RUNTIME_TOPICS.FETCH_FROM_DIRECTORY, fetchFromDirectory);
};
