import { ipcRenderer, contextBridge } from 'electron';
import { Context } from '@finos/fdc3';
import { RUNTIME_TOPICS } from '../../../main/src/handlers/runtime/topics';

let id: string | undefined = undefined;
let intent: string | undefined = undefined;
let context: Context | undefined = undefined;

ipcRenderer.on(RUNTIME_TOPICS.WINDOW_START, (event, args) => {
  console.log(event.type);
  id = args.id;
  intent = args.intent;
  context = args.context;

  document.dispatchEvent(
    new CustomEvent(RUNTIME_TOPICS.RES_LOAD_RESULTS, { detail: args }),
  );
});

const resolveIntent = (data: any) => {
  ipcRenderer.send(RUNTIME_TOPICS.RES_RESOLVE_INTENT, {
    id: id,
    data: {
      intent: data.selectedIntent || intent,
      selected: data.selected && data.selected.details,
      context: context,
    },
  });
};

const api = {
  resolveIntent,
};

contextBridge.exposeInMainWorld('agentResolver', api);
