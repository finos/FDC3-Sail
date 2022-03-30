import { ipcRenderer } from 'electron';
import { Context } from '@finos/fdc3';
import { TOPICS } from '../../../main/src/constants';

let id: string | undefined = undefined;
let intent: string | undefined = undefined;
let context: Context | undefined = undefined;

ipcRenderer.on(TOPICS.WINDOW_START, (event, args) => {
  console.log(event.type);
  id = args.id;
  intent = args.intent;
  context = args.context;

  document.dispatchEvent(
    new CustomEvent(TOPICS.RES_LOAD_INTENT_RESULTS, { detail: args }),
  );
});

const resolveIntent = (data: any) => {
  ipcRenderer.send(TOPICS.RES_RESOLVE_INTENT, {
    method: 'resolveIntent',
    id: id,
    intent: data.selectedIntent || intent,
    selected: data.selected.details,
    context: context,
  });
};

(document as any).addEventListener(
  TOPICS.RES_RESOLVE_INTENT,
  (event: CustomEvent) => {
    resolveIntent(event.detail);
  },
);
