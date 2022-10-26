/**
 * generates a CustomEvent for FDC3 eventing in the DOM
 * @param type
 * @param detail
 */
export const fdc3Event = (type: string, detail: unknown): CustomEvent => {
  return new CustomEvent(`FDC3:${type}`, { detail: detail });
};

export const channels = [
  {
    id: 'red',
    type: 'user',
    displayMetadata: { color: '#da2d2d', color2: '#9d0b0b', name: 'Red' },
  },
  {
    id: 'orange',
    type: 'user',
    displayMetadata: { color: '#eb8242', color2: '#e25822', name: 'Orange' },
  },
  {
    id: 'yellow',
    type: 'user',
    displayMetadata: { color: '#f6da63', color2: '#e3c878', name: 'Yellow' },
  },
  {
    id: 'green',
    type: 'user',
    displayMetadata: { color: '#42b883', color2: '#347474', name: 'Green' },
  },
  {
    id: 'blue',
    type: 'user',
    displayMetadata: { color: '#1089ff', color2: '#505BDA', name: 'Blue' },
  },
  {
    id: 'purple',
    type: 'user',
    displayMetadata: { color: '#C355F5', color2: '#AA26DA', name: 'Purple' },
  },
];

export enum TARGETS {
  SEARCH_RESULTS = 'searchResults',
  INTENT_RESOLVER = 'intentResolver',
  CHANNEL_PICKER = 'channelPicker',
}

export enum TOPICS {
  OPEN_TOOLS_MENU = 'FRAME:openToolsMenu',
  FRAME_READY = 'FRAME:ready',
  SEARCH = 'WORK:search',
  WORKSPACE_INIT = 'WORK:Init',
  WORKSPACE_START = 'WORK:Start',
  WINDOW_START = 'WIN:start',
  WINDOW_SHOW = 'WIN:show',
  ADD_TAB = 'WORK:addTab',
  NEW_TAB = 'WORK:newTab',
  NEW_TAB_CLICK = 'UI:newTab',
  OPEN_CHANNEL_PICKER_CLICK = 'UI:openChannelPicker',
  SELECT_TAB = 'WORK:selectTab', //tab state changes from event in the main process (i.e. change of focus from new view or intent resolution)
  TAB_SELECTED = 'WORK:tabSelected', //tab is selected by user action in the UI
  CLOSE_TAB = 'WORK:closeTab',
  TAB_DRAG_START = 'WORK:tabDragStart',
  TAB_DRAG_END = 'WORK:tabDragEnd',
  TEAR_OUT_TAB = 'WORK:tearOutTab',
  DROP_TAB = 'WORK:dropTab',
  REMOVE_TAB = 'WORK:removeTab', //prune tab without closing the view (when moving tab from one window to another)
  JOIN_CHANNEL = 'WORK:joinChannel',
  LEAVE_CHANNEL = 'WORK:leaveChannel',
  JOIN_WORKSPACE_TO_CHANNEL = 'FDC3:joinWorkspaceToChannel',
  CONFIRM_JOIN = 'FDC3:confirmJoin',
  PICK_CHANNEL = 'RES:pickChannel',
  CHANNEL_SELECTED = 'WORK:channelSelected',
  FETCH_FROM_DIRECTORY = 'WIN:fetchFromDirectory',
  FRAME_DEV_TOOLS = 'WORK:openFrameDevTools',
  TAB_DEV_TOOLS = 'WORK:openTabDevTools',
  RES_LOAD_RESULTS = 'RES:loadResults',
  RESULT_SELECTED = 'RES:resultSelected',
  RES_PICK_CHANNEL = 'RES:pickChannel',
  RES_RESOLVE_INTENT = 'RES:resolveIntent',
  RES_LOAD_INTENT_RESULTS = 'RES:loadIntentResults',
  HIDE_WINDOW = 'WORK:hideWindow',
  HIDE_RESULTS_WINDOW = 'UI:hideResultsWindow',
  FDC3_START = 'FDC3:start',
  FDC3_INITIATE = 'FDC3:initiate',
  FDC3_SET_CURRENT_CHANEL = 'FDC3:setCurrentChannel',
  FDC3_GET_OR_CREATE_CHANNEL = 'FDC3:getOrCreateChannel',
  FDC3_ADD_CONTEXT_LISTENER = 'FDC3:addContextListener',
  FDC3_INTENT = 'FDC3:intent',
  FDC3_CONTEXT = 'FDC3:context',
  FDC3_BROADCAST = 'FDC3:broadcast',
  FDC3_OPEN = 'FDC3:open',
  FDC3_DROP_CONTEXT_LISTENER = 'FDC3:dropContextListener',
  FDC3_GET_CURRENT_CONTEXT = 'FDC3:getCurrentContext',
  FDC3_GET_SYSTEM_CHANNELS = 'FDC3:getSystemChannels',
  FDC3_LEAVE_CURRENT_CHANNEL = 'FDC3:leaveCurrentChannel',
  FDC3_ADD_INTENT_LISTENER = 'FDC3:addIntentListener',
  FDC3_JOIN_CHANNEL = 'FDC3:joinChannel',
  FDC3_FIND_INTENT = 'FDC3:findIntent',
  FDC3_FIND_INTENTS_BY_CONTEXT = 'FDC3:findIntentsByContext',
  FDC3_GET_CURRENT_CHANNEL = 'FDC3:getCurrentChannel',
  FDC3_GET_APP_INSTANCE = 'FDC3:getAppInstance',
  FDC3_RAISE_INTENT = 'FDC3:raiseIntent',
  FDC3_RAISE_INTENT_FOR_CONTEXT = 'FDC3:raiseIntentForContext',
}
