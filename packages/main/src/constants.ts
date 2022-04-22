export const DEFAULT_WINDOW_HEIGHT = 600;
export const DEFAULT_WINDOW_WIDTH = 800;
export const TOOLBAR_HEIGHT = 120;

export enum TARGETS {
  SEARCH_RESULTS = 'searchResults',
  INTENT_RESOLVER = 'intentResolver',
  CHANNEL_PICKER = 'channelPicker',
}

/**
 * these are specifically FDC3 API events
 */
export enum TOPICS_FDC3 {
  START = 'FDC3:start',
  INITIATE = 'FDC3:initiate',
  SET_CURRENT_CHANEL = 'FDC3:setCurrentChannel',
  GET_OR_CREATE_CHANNEL = 'FDC3:getOrCreateChannel',
  ADD_CONTEXT_LISTENER = 'FDC3:addContextListener',
  INTENT = 'FDC3:intent',
  CONTEXT = 'FDC3:context',
  BROADCAST = 'FDC3:broadcast',
  OPEN = 'FDC3:open',
  DROP_CONTEXT_LISTENER = 'FDC3:dropContextListener',
  GET_CURRENT_CONTEXT = 'FDC3:getCurrentContext',
  GET_SYSTEM_CHANNELS = 'FDC3:getSystemChannels',
  LEAVE_CURRENT_CHANNEL = 'FDC3:leaveCurrentChannel',
  ADD_INTENT_LISTENER = 'FDC3:addIntentListener',
  JOIN_CHANNEL = 'FDC3:joinChannel',
  FIND_INTENT = 'FDC3:findIntent',
  FIND_INTENTS_BY_CONTEXT = 'FDC3:findIntentsByContext',
  GET_CURRENT_CHANNEL = 'FDC3:getCurrentChannel',
  GET_APP_INSTANCE = 'FDC3:getAppInstance',
  RAISE_INTENT = 'FDC3:raiseIntent',
  RAISE_INTENT_FOR_CONTEXT = 'FDC3:raiseIntentForContext',

};

/** topics refactor */
/**
 * these are topics spcific to the internal functioning of the Desktop Agent 
 * 
 */
export enum TOPICS_AGENT  {
  FRAME_READY = 'AGENT:frame-ready',
  SEARCH = 'AGENT:search',
  WORKSPACE_INIT = 'AGENT:workspace-init',
  WORKSPACE_START = 'AGENT:workspace-start',
  WINDOW_START = 'AGENT:window-start',
  WINDOW_SHOW = 'AGENT:window-show',
  ADD_TAB = 'AGENT:add-tab',
  NEW_TAB = 'AGENT:new-tab',
  NEW_TAB_CLICK = 'AGENT:new-tab-click',
  SELECT_TAB = 'AGENT:selectTab', //tab state changes from event in the main process (i.e. change of focus from new view or intent resolution)
  TAB_SELECTED = 'AGENT:tabSelected', //tab is selected by user action in the UI
  CLOSE_TAB = 'AGENT:closeTab',
  DROP_TAB = 'AGENT:dropTab',
  JOIN_CHANNEL = 'WORK:joinChannel',
  LEAVE_CHANNEL = 'WORK:leaveChannel',
  JOIN_WORKSPACE_TO_CHANNEL = 'AGENT:joinWorkspaceToChannel',
  CONFIRM_JOIN = 'AGENT:confirmJoin',
  PICK_CHANNEL = 'AGENT:pickChannel',
  CHANNEL_SELECTED = 'AGENT:channelSelected',
  FETCH_FROM_DIRECTORY = 'AGENT:fetchFromDirectory',
  FRAME_DEV_TOOLS = 'AGENT:openFrameDevTools',
  TAB_DEV_TOOLS = 'AGENT:openTabDevTools',
  RES_LOAD_RESULTS = 'AGENT:loadResults',
  RESULT_SELECTED = 'AGENT:resultSelected',
  RES_PICK_CHANNEL = 'AGENT:pickChannel',
  RES_RESOLVE_INTENT = 'AGENT:resolveIntent',
  RES_LOAD_INTENT_RESULTS = 'AGENT:loadIntentResults',
  HIDE_WINDOW = 'AGENT:hideWindow',
  HIDE_RESULTS_WINDOW = 'AGENT:hideResultsWindow',

};

/**
 * topics specific to the UI code for the agent
 */
export enum TOPICS_UI {
  CHANNEL_PICKER_CLICK = 'UI:openChannelPicker',
  OPEN_FRAME_TOOLS_CLICK = 'UI:openFrameTools',
  OPEN_TAB_TOOLS_CLICK = 'UI:openTabTools',
}




export enum TOPICS {
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
  OPEN_FRAME_TOOLS_CLICK = 'UI:openFrameTools',
  OPEN_TAB_TOOLS_CLICK = 'UI:openTabTools',
  SELECT_TAB = 'WORK:selectTab', //tab state changes from event in the main process (i.e. change of focus from new view or intent resolution)
  TAB_SELECTED = 'WORK:tabSelected', //tab is selected by user action in the UI
  CLOSE_TAB = 'WORK:closeTab',
  DROP_TAB = 'WORK:dropTab',
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
