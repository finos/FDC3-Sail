import { createAgent } from '@connectifi/agent-web';
import { RUNTIME_TOPICS } from '/@main/handlers/runtime/topics';
import { SAIL_TOPICS } from '/@main/handlers/runtime/topics';
import { contextBridge, ipcRenderer } from 'electron';
import { createAPI } from './api';

const connect = () => {
  //handshake with main and get instanceId assigned
  ipcRenderer.on(RUNTIME_TOPICS.WINDOW_START, async (event, args) => {
    console.log('api FDC3 start', args.id);
    if (args.id) {
      const agent = await createAgent(
        'https://dev.connectifi-interop.com',
        `${args.id}@sandbox`,
      );
      contextBridge.exposeInMainWorld('fdc3', createAPI(agent));
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', async () => {
          /* expose the fdc3 api across the context isolation divide...*/
          document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
        });
      } else {
        /* expose the fdc3 api across the context isolation divide...*/
        //contextBridge.exposeInMainWorld('fdc3', DesktopAgent);
        document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
      }
    }
  });
  ipcRenderer.send(SAIL_TOPICS.INITIATE, {});
};

connect();
