import { ipcRenderer } from 'electron';
import { RUNTIME_TOPICS } from '/@main/handlers/runtime/topics';

let id: string | undefined = undefined;

/**
 * listen for start event - assigning id for the instance
 */
ipcRenderer.on(RUNTIME_TOPICS.WINDOW_START, (event, args) => {
  console.log(event.type);
  id = args.id;
});

const close = () => {
  ipcRenderer.send(RUNTIME_TOPICS.CLOSE_TAB, {
    source: id,
    data: {
      closeType: 'view',
    },
  });
};

export const sail = {
  close,
};
