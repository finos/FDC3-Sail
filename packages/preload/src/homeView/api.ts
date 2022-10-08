import { ipcRenderer } from 'electron';
import { FDC3_TOPICS } from '../../../main/src/handlers/fdc3/1.2/topics';
import { RUNTIME_TOPICS } from '../../../main/src/handlers/runtime/topics';
//const RUNTIME_TOPICS = {};
/**
 * home api
 *  - getApps
 *  - get directory listings of apps for the directory for this agent
 */

let instanceId = '';
const eventQ: Array<{ topic: string; data: any }> = [];

/**
 * listen for start event - assigning id for the instance
 */
ipcRenderer.on(FDC3_TOPICS.START, async (event, args) => {
  console.log('home - FDC3 start', args);
  if (args.id) {
    instanceId = args.id;
    console.log('calling Q', eventQ);
    eventQ.forEach((msg) => {
      ipcRenderer.send(msg.topic, {
        source: instanceId,
        data: msg.data,
      });
    });
  }
});

export const getApps = () => {
  return new Promise((resolve) => {
    ipcRenderer.once(
      `${RUNTIME_TOPICS.FETCH_FROM_DIRECTORY}-/apps`,
      (event, args) => {
        const results = args.data;
        resolve(results);
      },
    );
    if (instanceId !== '') {
      // Fetch External Data Source
      ipcRenderer.send(RUNTIME_TOPICS.FETCH_FROM_DIRECTORY, {
        source: instanceId,
        data: {
          sourceType: 'view',
          query: `/apps`,
        },
      });
    } else {
      eventQ.push({
        topic: RUNTIME_TOPICS.FETCH_FROM_DIRECTORY,
        data: {
          sourceType: 'view',
          query: `/apps`,
        },
      });
    }
  });
};
