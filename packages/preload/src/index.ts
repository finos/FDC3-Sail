import { ipcRenderer } from 'electron';
import { contextBridge } from 'electron';

/**
 * inline these dependencies ahead of refactoring the whole preload
 **/

export const channels = [
  {
    id: 'red',
    type: 'system',
    displayMetadata: { color: '#da2d2d', color2: '#9d0b0b', name: 'Red' },
  },
  {
    id: 'orange',
    type: 'system',
    displayMetadata: { color: '#eb8242', color2: '#e25822', name: 'Orange' },
  },
  {
    id: 'yellow',
    type: 'system',
    displayMetadata: { color: '#f6da63', color2: '#e3c878', name: 'Yellow' },
  },
  {
    id: 'green',
    type: 'system',
    displayMetadata: { color: '#42b883', color2: '#347474', name: 'Green' },
  },
  {
    id: 'blue',
    type: 'system',
    displayMetadata: { color: '#1089ff', color2: '#505BDA', name: 'Blue' },
  },
  {
    id: 'purple',
    type: 'system',
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

//flag to indicate the background script is ready for fdc3!
let connected = true;
let id: string | null = null;
let frameReady = false;

/**
 * listen for start event - assigning id for the instance
 */
ipcRenderer.on(TOPICS.WORKSPACE_START, async (event, args) => {
  console.log(TOPICS.WORKSPACE_START, args);
  if (args.id) {
    id = args.id;
    connected = true;
  }
});

ipcRenderer.on(TOPICS.ADD_TAB, (event, args) => {
  const tabEvent = new CustomEvent(TOPICS.ADD_TAB, {
    detail: {
      viewId: args.viewId,
      title: args.title,
    },
  });

  if (frameReady) {
    document.dispatchEvent(tabEvent);
  } else {
    document.addEventListener(TOPICS.FRAME_READY, () => {
      document.dispatchEvent(tabEvent);
    });
  }
});

ipcRenderer.on(TOPICS.SELECT_TAB, (event, args) => {
  console.log('select tab', args.viewId);
  document.dispatchEvent(
    new CustomEvent(TOPICS.SELECT_TAB, {
      detail: {
        selected: args.viewId,
      },
    }),
  );
});

ipcRenderer.on(TOPICS.REMOVE_TAB, (event, args) => {
  document.dispatchEvent(
    new CustomEvent(TOPICS.REMOVE_TAB, {
      detail: {
        tabId: args.tabId,
      },
    }),
  );
});

ipcRenderer.on(TOPICS.CHANNEL_SELECTED, async (event, args) => {
  const channel =
    args.channel !== 'default'
      ? channels.find((c) => {
          return c.id === args.channel;
        })
      : { id: 'default', displayMetadata: { color: '', color2: '' } };
  document.dispatchEvent(
    new CustomEvent(TOPICS.CHANNEL_SELECTED, { detail: { channel: channel } }),
  );
});

document.addEventListener(TOPICS.OPEN_TOOLS_MENU, ((event: CustomEvent) => {
  ipcRenderer.send(TOPICS.OPEN_TOOLS_MENU, {
    source: id,
    data: event.detail,
  });
}) as EventListener);

document.addEventListener(TOPICS.JOIN_CHANNEL, ((event: CustomEvent) => {
  ipcRenderer.send(TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
    source: id,
    data: event.detail,
  });
}) as EventListener);

document.addEventListener(TOPICS.TAB_SELECTED, ((event: CustomEvent) => {
  ipcRenderer.send(TOPICS.TAB_SELECTED, {
    source: id,
    selected: event.detail.selected,
  });
}) as EventListener);

document.addEventListener(TOPICS.CLOSE_TAB, ((event: CustomEvent) => {
  ipcRenderer.send(TOPICS.CLOSE_TAB, { source: id, tabId: event.detail.tabId });
}) as EventListener);

document.addEventListener(TOPICS.TAB_DRAG_START, ((event: CustomEvent) => {
  ipcRenderer.send(TOPICS.TAB_DRAG_START, {
    source: id,
    selected: event.detail.selected,
  });
}) as EventListener);

document.addEventListener(TOPICS.DROP_TAB, ((event: CustomEvent) => {
  ipcRenderer.send(TOPICS.DROP_TAB, {
    source: id,
    tabId: event.detail.tabId,
    frameTarget: event.detail.frameTarget,
  });
}) as EventListener);

document.addEventListener(TOPICS.TEAR_OUT_TAB, ((event: CustomEvent) => {
  ipcRenderer.send(TOPICS.TEAR_OUT_TAB, {
    source: id,
    tabId: event.detail.tabId,
  });
}) as EventListener);

document.addEventListener(TOPICS.SEARCH, ((event: CustomEvent) => {
  const query = event.detail.query;
  ipcRenderer.once(
    `${TOPICS.FETCH_FROM_DIRECTORY}-/apps/search?text=${query}`,
    (event, args) => {
      //resolve(args.data);
      //add web search results
      const results = args.data;

      ipcRenderer.send(TOPICS.RES_LOAD_RESULTS, {
        source: id,
        results: results,
      });
    },
  );
  // Fetch External Data Source
  ipcRenderer.send(TOPICS.FETCH_FROM_DIRECTORY, {
    source: id,
    query: `/apps/search?text=${query}`,
  });
}) as EventListener);

document.addEventListener(TOPICS.HIDE_RESULTS_WINDOW, () => {
  ipcRenderer.send(TOPICS.HIDE_WINDOW, {
    source: id,
    target: TARGETS.SEARCH_RESULTS,
  });
});
/*
    Listen for UI Events
*/

document.addEventListener(TOPICS.NEW_TAB_CLICK, () => {
  ipcRenderer.send(TOPICS.NEW_TAB, { source: id });
});

document.addEventListener(TOPICS.OPEN_CHANNEL_PICKER_CLICK, ((
  event: CustomEvent,
) => {
  ipcRenderer.send(TOPICS.RES_PICK_CHANNEL, {
    source: id,
    mouseX: event.detail.mouseX,
    mouseY: event.detail.mouseY,
  });
}) as EventListener);

document.addEventListener(TOPICS.FRAME_READY, () => {
  frameReady = true;
});

//viewId of currently selected tab
let currentTab: string | null = null;

const selectTab = (selectedId: string) => {
  //change the selection state of the tabs
  if (currentTab) {
    const oldTab = document.getElementById(`tab_${currentTab}`);
    if (oldTab) {
      oldTab.className = 'tab';
    }
  }
  currentTab = selectedId;
  const newTab = document.getElementById(`tab_${selectedId}`);
  if (newTab) {
    newTab.className = 'tab selected';
  }
};

document.addEventListener(TOPICS.SELECT_TAB, ((event: CustomEvent) => {
  selectTab(event.detail.selected);
}) as EventListener);

document.addEventListener(TOPICS.CHANNEL_SELECTED, ((event: CustomEvent) => {
  //highlight the channelPicker button on selection (remove on deselection)
  const channelPicker = document.getElementById('channelPicker');
  if (channelPicker) {
    channelPicker.style.backgroundColor =
      event.detail.channel.displayMetadata.color;
    channelPicker.style.borderColor =
      event.detail.channel.displayMetadata.color2;
  }
}) as EventListener);

const api = {
  isConnected: (): boolean => {
    return connected;
  },
};

contextBridge.exposeInMainWorld('versions', process.versions);

contextBridge.exposeInMainWorld('workspace', api);
