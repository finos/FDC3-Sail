import { ipcRenderer, contextBridge } from 'electron';
import { TOPICS, TARGETS } from '../../../main/src/constants';
import { RUNTIME_TOPICS } from '../../../main/src/handlers/runtime/topics';

let workspaceId: string | null = null;

ipcRenderer.on(RUNTIME_TOPICS.WINDOW_START, (event, args) => {
  workspaceId = args.workspaceId;
  console.log(event.type, workspaceId);
});

ipcRenderer.on(RUNTIME_TOPICS.SEARCH_LOAD_RESULTS, (event, args) => {
  document.dispatchEvent(
    new CustomEvent(RUNTIME_TOPICS.SEARCH_LOAD_RESULTS, {
      detail: { results: args.results },
    }),
  );
});

const selectResult = (selection: string) => {
  ipcRenderer.send(TOPICS.FDC3_OPEN, {
    topic: 'open',
    source: workspaceId,
    data: { name: selection },
  });

  ipcRenderer.send(TOPICS.HIDE_WINDOW, {
    source: workspaceId,
    target: TARGETS.SEARCH_RESULTS,
  });
};

const api = {
  selectResult,
};

contextBridge.exposeInMainWorld('agentSearch', api);
