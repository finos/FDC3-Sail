import { ipcRenderer } from 'electron';
import { contextBridge } from 'electron';
import { channels } from '../../../main/src/system-channels';
import { TARGETS } from '../../../main/src/constants';
import { RUNTIME_TOPICS } from '../../../main/src/handlers/runtime/topics';

/**
 * inline these dependencies ahead of refactoring the whole preload
 **/

//flag to indicate the background script is ready for fdc3!
let connected = true;
let id: string | null = null;
let frameReady = false;

ipcRenderer.on(RUNTIME_TOPICS.SELECT_TAB, (event, args) => {
  document.dispatchEvent(
    new CustomEvent(RUNTIME_TOPICS.SELECT_TAB, {
      detail: {
        selected: args.viewId,
      },
    }),
  );
});

ipcRenderer.on(RUNTIME_TOPICS.REMOVE_TAB, (event, args) => {
  document.dispatchEvent(
    new CustomEvent(RUNTIME_TOPICS.REMOVE_TAB, {
      detail: {
        tabId: args.tabId,
      },
    }),
  );
});

ipcRenderer.on(RUNTIME_TOPICS.CHANNEL_SELECTED, async (event, args) => {
  const channel =
    args.channel !== 'default'
      ? channels.find((c) => {
          return c.id === args.channel;
        })
      : { id: 'default', displayMetadata: { color: '', color2: '' } };
  document.dispatchEvent(
    new CustomEvent(RUNTIME_TOPICS.CHANNEL_SELECTED, {
      detail: { channel: channel },
    }),
  );
});

const selectTab = (selectedId: string) => {
  ipcRenderer.send(RUNTIME_TOPICS.TAB_SELECTED, {
    source: id,
    data: { selected: selectedId },
  });
};

document.addEventListener(RUNTIME_TOPICS.CHANNEL_SELECTED, ((
  event: CustomEvent,
) => {
  //highlight the channelPicker button on selection (remove on deselection)
  const channelPicker = document.getElementById('channelPicker');
  if (channelPicker) {
    channelPicker.style.backgroundColor =
      event.detail.channel.displayMetadata.color;
    channelPicker.style.borderColor =
      event.detail.channel.displayMetadata.color2;
  }
}) as EventListener);

/**
 * listen for start event - assigning id for the instance
 */
ipcRenderer.on(RUNTIME_TOPICS.WINDOW_START, async (event, args) => {
  console.log('window start', args.id);
  if (args.id) {
    id = args.id;
    connected = true;
  }
});

const isConnected = (): boolean => {
  return connected;
};

const openToolsMenu = (clientX: number, clientY: number) => {
  ipcRenderer.send(RUNTIME_TOPICS.OPEN_TOOLS_MENU, {
    source: id,
    data: { clientX: clientX, clientY: clientY },
  });
};

ipcRenderer.on(RUNTIME_TOPICS.ADD_TAB, (event, args) => {
  const tabEvent = new CustomEvent(RUNTIME_TOPICS.ADD_TAB, {
    detail: {
      viewId: args.viewId,
      title: args.title,
    },
  });

  if (frameReady) {
    document.dispatchEvent(tabEvent);
  } else {
    tabQ.push(tabEvent);
  }
});

const tabQ: Array<CustomEvent> = [];

const isReady = () => {
  frameReady = true;
  if (tabQ.length > 0) {
    tabQ.forEach((tabEvent) => {
      document.dispatchEvent(tabEvent);
    });
  }
};

const tabDragStart = (selected: string) => {
  ipcRenderer.send(RUNTIME_TOPICS.TAB_DRAG_START, {
    source: id,
    data: {
      selected: selected,
    },
  });
};

const newTab = () => {
  ipcRenderer.send(RUNTIME_TOPICS.NEW_TAB, { source: id });
};

const closeTab = (tabId: string) => {
  ipcRenderer.send(RUNTIME_TOPICS.CLOSE_TAB, {
    source: id,
    data: { tabId: tabId },
  });
};

const tearOutTab = (tabId: string) => {
  ipcRenderer.send(RUNTIME_TOPICS.TEAR_OUT_TAB, {
    source: id,
    data: {
      tabId: tabId,
    },
  });
};

const dropTab = (frameTarget: boolean) => {
  ipcRenderer.send(RUNTIME_TOPICS.DROP_TAB, {
    source: id,
    data: {
      frameTarget: frameTarget,
    },
  });
};

const openChannelPicker = (mouseX: number, mouseY: number) => {
  console.log('preload - channel picker click', id);
  ipcRenderer.send(RUNTIME_TOPICS.OPEN_CHANNEL_PICKER, {
    source: id,
    data: {
      mouseX: mouseX,
      mouseY: mouseY,
    },
  });
};

const hideResultsWindow = () => {
  ipcRenderer.send(RUNTIME_TOPICS.HIDE_WINDOW, {
    source: id,

    target: TARGETS.SEARCH_RESULTS,
  });
};

const searchDirectory = (query: string) => {
  ipcRenderer.once(
    `${RUNTIME_TOPICS.FETCH_FROM_DIRECTORY}-/apps/search?text=${query}`,
    (event, args) => {
      //resolve(args.data);
      //add web search results
      const results = args.data;

      ipcRenderer.send(RUNTIME_TOPICS.SEARCH_LOAD_RESULTS, {
        source: id,
        data: {
          results: results,
        },
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
};

const api = {
  isConnected,
  selectTab,
  tearOutTab,
  openToolsMenu,
  isReady,
  newTab,
  openChannelPicker,
  hideResultsWindow,
  searchDirectory,
  dropTab,
  tabDragStart,
  closeTab,
};

contextBridge.exposeInMainWorld('versions', process.versions);

contextBridge.exposeInMainWorld('agentFrame', api);
