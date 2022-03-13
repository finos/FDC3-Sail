import { ipcRenderer } from 'electron';
import { TOPICS } from '../../../main/src/constants';

let id: string | null = null;
let intent: string | null = null;
let context: any = null;

ipcRenderer.on(TOPICS.WINDOW_START, (event, args) => {
  console.log(event.type);
  id = args.id;
  intent = args.intent;
  context = args.context;

  document.dispatchEvent(
    new CustomEvent(TOPICS.RES_LOAD_INTENT_RESULTS, { detail: args }),
  );
});

const resolveIntent = (selected: any) => {
  ipcRenderer.send(TOPICS.RES_RESOLVE_INTENT, {
    method: 'resolveIntent',
    id: id,
    intent: intent,
    selected: selected.details,
    context: context,
  });
};

(document as any).addEventListener(
  TOPICS.RES_RESOLVE_INTENT,
  (event: CustomEvent) => {
    resolveIntent(event.detail.selected);
  },
);
