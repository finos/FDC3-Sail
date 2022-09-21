import { ipcRenderer } from 'electron';
import { contextBridge } from 'electron';
import { channels } from '../../main/src/system-channels';
import { TOPICS, TARGETS } from '../../main/src/constants';
import { RUNTIME_TOPICS } from '../../main/src/handlers/runtime/index';

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

document.addEventListener(RUNTIME_TOPICS.TAB_SELECTED, ((
  event: CustomEvent,
) => {
  ipcRenderer.send(RUNTIME_TOPICS.TAB_SELECTED, {
    source: id,
    data: {
      selected: event.detail.selected,
    },
  });
}) as EventListener);

document.addEventListener(RUNTIME_TOPICS.CLOSE_TAB, ((event: CustomEvent) => {
  ipcRenderer.send(RUNTIME_TOPICS.CLOSE_TAB, {
    source: id,
    data: { tabId: event.detail.tabId },
  });
}) as EventListener);

document.addEventListener(RUNTIME_TOPICS.TAB_DRAG_START, ((
  event: CustomEvent,
) => {
  ipcRenderer.send(RUNTIME_TOPICS.TAB_DRAG_START, {
    source: id,
    data: {
      selected: event.detail.selected,
    },
  });
}) as EventListener);

document.addEventListener(RUNTIME_TOPICS.DROP_TAB, ((event: CustomEvent) => {
  ipcRenderer.send(RUNTIME_TOPICS.DROP_TAB, {
    source: id,
    data: {
      tabId: event.detail.tabId,
      frameTarget: event.detail.frameTarget,
    },
  });
}) as EventListener);

document.addEventListener(RUNTIME_TOPICS.TEAR_OUT_TAB, ((
  event: CustomEvent,
) => {
  ipcRenderer.send(TOPICS.TEAR_OUT_TAB, {
    source: id,
    data: {
      tabId: event.detail.tabId,
    },
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
  ipcRenderer.send(RUNTIME_TOPICS.FETCH_FROM_DIRECTORY, {
    source: id,
    data: {
      query: `/apps/search?text=${query}`,
    },
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
