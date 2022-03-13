import { ipcRenderer } from 'electron';
import { TOPICS, TARGETS } from '../../../main/src/constants';

let workspaceId: string | null = null;

ipcRenderer.on(TOPICS.WINDOW_START, (event, args) => {
  workspaceId = args.workspaceId;
  console.log(event.type, workspaceId);
});

ipcRenderer.on(TOPICS.RES_LOAD_RESULTS, (event, args) => {
  console.log(event.type, args);
  document.dispatchEvent(
    new CustomEvent(TOPICS.RES_LOAD_RESULTS, {
      detail: { results: args.results },
    }),
  );
});

(document as any).addEventListener(
  TOPICS.RESULT_SELECTED,
  (event: CustomEvent) => {
    const result = event.detail.result;
    const selection = result.name;
    if (selection) {
      ipcRenderer.send(TOPICS.FDC3_OPEN, {
        topic: 'open',
        source: workspaceId,
        data: { name: selection },
      });
    } else if (result.start_url) {
      ipcRenderer.send(TOPICS.NAVIGATE, {
        url: result.start_url,
        target: 'tab',
        source: workspaceId,
      });
    }
    ipcRenderer.send(TOPICS.HIDE_WINDOW, {
      source: workspaceId,
      target: TARGETS.SEARCH_RESULTS,
    });
  },
);
