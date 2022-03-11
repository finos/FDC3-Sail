import { ipcRenderer } from 'electron';
import { contextBridge } from 'electron';
import { channels } from '../../main/src/system-channels';
import { TOPICS } from '../../main/src/constants';

//flag to indicate the background script is ready for fdc3!
let connected = true;
let id: string | null = null;

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
  document.dispatchEvent(
    new CustomEvent(TOPICS.ADD_TAB, {
      detail: {
        viewId: args.viewId,
        title: args.title,
      },
    }),
  );
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

(document as any).addEventListener(
  TOPICS.JOIN_CHANNEL,
  (event: CustomEvent) => {
    ipcRenderer.send(TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
      source: id,
      data: event.detail,
    });
  },
);

(document as any).addEventListener(TOPICS.SELECT_TAB, (event: CustomEvent) => {
  ipcRenderer.send(TOPICS.SELECT_TAB, {
    source: id,
    selected: event.detail.selected,
  });
});

(document as any).addEventListener(TOPICS.CLOSE_TAB, (event: CustomEvent) => {
  ipcRenderer.send(TOPICS.CLOSE_TAB, { source: id, tabId: event.detail.tabId });
});

(document as any).addEventListener(TOPICS.DROP_TAB, (event: CustomEvent) => {
  ipcRenderer.send(TOPICS.DROP_TAB, { source: id, tabId: event.detail.tabId });
});

(document as any).addEventListener(TOPICS.SEARCH, (event: CustomEvent) => {
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
});

/*
    Listen for UI Events
*/

document.addEventListener(TOPICS.NEW_TAB_CLICK, () => {
  ipcRenderer.send(TOPICS.NEW_TAB, { source: id });
});

(document as any).addEventListener(
  TOPICS.OPEN_CHANNEL_PICKER_CLICK,
  (event: CustomEvent) => {
    ipcRenderer.send(TOPICS.RES_PICK_CHANNEL, {
      source: id,
      mouseX: event.detail.mouseX,
      mouseY: event.detail.mouseY,
    });
  },
);

document.addEventListener(TOPICS.OPEN_FRAME_TOOLS_CLICK, () => {
  ipcRenderer.send(TOPICS.FRAME_DEV_TOOLS, { source: id });
});

document.addEventListener(TOPICS.OPEN_TAB_TOOLS_CLICK, () => {
  ipcRenderer.send(TOPICS.TAB_DEV_TOOLS, { source: id });
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

(document as any).addEventListener(TOPICS.SELECT_TAB, (event: CustomEvent) => {
  selectTab(event.detail.selected);
});

(document as any).addEventListener(
  TOPICS.CHANNEL_SELECTED,
  (event: CustomEvent) => {
    //highlight the channelPicker button on selection (remove on deselection)
    const channelPicker = document.getElementById('channelPicker');
    if (channelPicker) {
      channelPicker.style.backgroundColor =
        event.detail.channel.displayMetadata.color;
      channelPicker.style.borderColor =
        event.detail.channel.displayMetadata.color2;
    }
  },
);

const api = {
  isConnected: (): boolean => {
    return connected;
  },
};

contextBridge.exposeInMainWorld('versions', process.versions);

contextBridge.exposeInMainWorld('workspace', api);
