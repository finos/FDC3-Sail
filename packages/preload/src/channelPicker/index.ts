import { ipcRenderer } from 'electron';
import { TOPICS, TARGETS } from '../../../main/src/constants';

let workspaceId: string | null = null;
let selected: string | null = null;

ipcRenderer.on(TOPICS.WINDOW_START, (event, args) => {
  console.log('channels window start ', args);
  workspaceId = args.workspaceId;
  //  start(channels);
});

ipcRenderer.on(TOPICS.CHANNEL_SELECTED, (event, args) => {
  console.log('ipc-event', event.type);
  channelSelected(args.channel);
});

document.addEventListener(TOPICS.JOIN_CHANNEL, ((event: CustomEvent) => {
  console.log('join channel', event);
  if (selected !== event.detail.channel) {
    selected = event.detail.channel;
    ipcRenderer.send(TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
      source: workspaceId,
      data: { channel: event.detail.channel },
    });
  } else {
    console.log('leave channel');
    selected = null;
    ipcRenderer.send(TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
      source: workspaceId,
      data: { channel: 'default' },
    });
  }
}) as EventListener);

document.addEventListener(TOPICS.HIDE_WINDOW, (() => {
  console.log('hide channel window');
  ipcRenderer.send(TOPICS.HIDE_WINDOW, {
    source: workspaceId,
    target: TARGETS.CHANNEL_PICKER,
  });
}) as EventListener);

document.addEventListener(TOPICS.LEAVE_CHANNEL, (() => {
  console.log('leave channel');
  selected = null;
  ipcRenderer.send(TOPICS.JOIN_WORKSPACE_TO_CHANNEL, {
    source: workspaceId,
    data: { channel: 'default' },
  });
}) as EventListener);

//document.addEventListener(TOPICS.CHANNEL_SELECTED,(event : CustomEvent) => {
const channelSelected = (channel: string) => {
  //deselect the previous selection if one
  if (selected && selected !== 'default') {
    const selectedElement = document.getElementById(selected);
    if (selectedElement) {
      const text = selectedElement.querySelector('.text');
      if (text) {
        text.textContent = '';
      }
    }
  }
  //set the new selected value
  selected = channel;

  //update the ui with the new selection
  //ignore if selected is "default" (no selection)
  if (selected !== 'default') {
    const selectedElement = document.getElementById(selected);
    if (selectedElement) {
      const text = selectedElement.querySelector('.text');
      if (text) {
        text.textContent = '\u2666';
      }
    }
  }
};
