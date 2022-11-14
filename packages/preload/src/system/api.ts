import { ipcRenderer } from 'electron';
import { RUNTIME_TOPICS } from '/@main/handlers/runtime/topics';
import { TARGETS } from '/@main/constants';
import { userChannels } from '/@main/handlers/fdc3/userChannels';
import { Context } from '@finos/fdc3';
import { FDC3_2_0_TOPICS } from '/@main/handlers/fdc3/2.0/topics';
import { FDC3_1_2_TOPICS } from '/@main/handlers/fdc3/1.2/topics';

let id: string | undefined = undefined;
let intent: string | undefined = undefined;
let context: Context | undefined = undefined;
let frameReady = false;
let workspaceId: string | null = null;
let selectedChannel: string | null = null;

const eventQ: Array<() => void> = [];
/**
 * listen for start event - assigning id for the instance
 */
ipcRenderer.on(RUNTIME_TOPICS.WINDOW_START, (event, args) => {
  console.log(event.type);
  id = args.id;
  intent = args.intent;
  context = args.context;
  workspaceId = args.workspaceId;

  //if this is an intent resolver, dispatch the options
  if (args.options) {
    document.dispatchEvent(
      new CustomEvent(RUNTIME_TOPICS.RES_LOAD_RESULTS, { detail: args }),
    );
  }
  if (eventQ.length > 0) {
    eventQ.forEach((item) => {
      item.call(this);
    });
  }
});

const resolveIntent = (data: {
  selectedIntent: any;
  selected: { details: any };
}) => {
  //no op if intent is not defined
  if (data.selectedIntent || intent) {
    ipcRenderer.send(FDC3_1_2_TOPICS.RESOLVE_INTENT, {
      id: id,
      data: {
        intent: data.selectedIntent || intent,
        selected: data.selected && data.selected.details,
        context: context,
      },
    });
  }
};

const getSessionState = () => {
  return new Promise((resolve) => {
    ipcRenderer.once(RUNTIME_TOPICS.GET_SESSION_STATE, (event, args) => {
      const results = args.data;
      resolve(results);
    });
    if (id) {
      // Get the session state
      ipcRenderer.send(RUNTIME_TOPICS.GET_SESSION_STATE, {
        source: id,
        data: {},
      });
    }
  });
};

const getApps = () => {
  return new Promise((resolve) => {
    ipcRenderer.once(
      `${RUNTIME_TOPICS.FETCH_FROM_DIRECTORY}-`,
      (event, args) => {
        const results = args.data;
        resolve(results);
      },
    );
    if (id) {
      ipcRenderer.send(RUNTIME_TOPICS.FETCH_FROM_DIRECTORY, {
        source: id,
        data: {
          sourceType: 'view',
          query: '',
        },
      });
    } else {
      eventQ.push(() => {
        ipcRenderer.send(RUNTIME_TOPICS.FETCH_FROM_DIRECTORY, {
          source: id,
          data: {
            sourceType: 'view',
            query: '',
          },
        });
      });
    }
  });
};

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
      ? userChannels.find((c) => {
          return c.id === args.channel;
        })
      : { id: 'default', displayMetadata: { color: '', color2: '' } };
  document.dispatchEvent(
    new CustomEvent(RUNTIME_TOPICS.CHANNEL_SELECTED, {
      detail: { channel: channel },
    }),
  );
});

ipcRenderer.on(RUNTIME_TOPICS.SEARCH_LOAD_RESULTS, (event, args) => {
  document.dispatchEvent(
    new CustomEvent(RUNTIME_TOPICS.SEARCH_LOAD_RESULTS, {
      detail: { results: args.results },
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

const isConnected = (): boolean => {
  return id !== undefined;
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

const selectResult = (selection: string) => {
  ipcRenderer.send(FDC3_2_0_TOPICS.OPEN, {
    source: workspaceId,
    data: { name: selection },
  });

  ipcRenderer.send(RUNTIME_TOPICS.HIDE_WINDOW, {
    source: workspaceId,
    target: TARGETS.SEARCH_RESULTS,
  });
};

ipcRenderer.on(RUNTIME_TOPICS.CHANNEL_SELECTED, (event, args) => {
  channelSelected(args.channel);
});

//document.addEventListener(TOPICS.CHANNEL_SELECTED,(event : CustomEvent) => {
const channelSelected = (channel: string) => {
  document.dispatchEvent(
    new CustomEvent(RUNTIME_TOPICS.CHANNEL_SELECTED, {
      detail: {
        channel: channel,
      },
    }),
  );
};

const joinChannel = (channel: string) => {
  if (selectedChannel !== channel) {
    selectedChannel = channel;
    ipcRenderer.send(RUNTIME_TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
      source: workspaceId,
      data: { channel: channel },
    });
  } else {
    selectedChannel = null;
    ipcRenderer.send(RUNTIME_TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
      source: workspaceId,
      data: { channel: 'default' },
    });
  }
};

const hideWindow = () => {
  ipcRenderer.send(RUNTIME_TOPICS.HIDE_WINDOW, {
    source: workspaceId,
    target: TARGETS.CHANNEL_PICKER,
  });
};

const leaveChannel = () => {
  selectedChannel = null;
  ipcRenderer.send(RUNTIME_TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
    source: workspaceId,
    data: { channel: 'default' },
  });
};

export const api = {
  isConnected,
  isReady,
  joinChannel,
  leaveChannel,
  hideWindow,
  resolveIntent,
  versions: process.versions,
  getApps,
  getSessionState,
  tabs: {
    select: selectTab,
    tearOut: tearOutTab,
    new: newTab,
    drop: dropTab,
    dragStart: tabDragStart,
    close: closeTab,
  },
  menu: {
    openTools: openToolsMenu,
    openChannelPicker: openChannelPicker,
  },
  search: {
    hideResultsWindow,
    searchDirectory,
    selectResult,
  },
};
