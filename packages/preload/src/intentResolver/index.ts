import { ipcRenderer } from 'electron';
import { Context } from '@finos/fdc3';
import { FDC3MessageData } from '../../../main/src/types/FDC3Message';
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

const resolveIntent = (data: FDC3MessageData) => {
  ipcRenderer.send(TOPICS.RES_RESOLVE_INTENT, {
    method: 'resolveIntent',
    id: id,
    intent: data.selectedIntent || intent,
    selected: data.selected && data.selected.details,
    context: context,
  });
};

document.addEventListener(TOPICS.RES_RESOLVE_INTENT, ((event: CustomEvent) => {
  resolveIntent(event.detail);
}) as EventListener);
