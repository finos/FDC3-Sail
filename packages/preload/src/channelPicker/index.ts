import { ipcRenderer, contextBridge } from 'electron';
import { RUNTIME_TOPICS } from '../../../main/src/handlers/runtime/topics';
import { TARGETS } from '../../../main/src/constants';

let workspaceId: string | null = null;
let selected: string | null = null;

ipcRenderer.on(RUNTIME_TOPICS.WINDOW_START, (event, args) => {
  workspaceId = args.workspaceId;
});

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
  if (selected !== channel) {
    selected = channel;
    ipcRenderer.send(RUNTIME_TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
      source: workspaceId,
      data: { channel: channel },
    });
  } else {
    selected = null;
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
  selected = null;
  ipcRenderer.send(RUNTIME_TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
    source: workspaceId,
    data: { channel: 'default' },
  });
};

const api = {
  joinChannel,
  hideWindow,
  leaveChannel,
};
contextBridge.exposeInMainWorld('agentChannelPicker', api);
