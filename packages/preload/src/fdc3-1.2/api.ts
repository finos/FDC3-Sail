import {
  setInstanceId,
  getEventQ,
  processQueueItem,
} from '../lib/lib';

import { RUNTIME_TOPICS, SAIL_TOPICS } from '/@main/handlers/runtime/topics';
import { MessagingSupport, SendMessage } from '../message';
import { createDesktopAgentInstance } from './desktop-agent';
import { DesktopAgent } from 'fdc3-1.2';

export const createAPI = (sendMessage: SendMessage, ipc: MessagingSupport): DesktopAgent => {
  
  //handshake with main and get instanceId assigned
  ipc.on(RUNTIME_TOPICS.WINDOW_START, async (event, args) => {
    console.log('api FDC3 start', args.id);
    if (args.id) {
      setInstanceId(args.id);
      if (!document.body) {
        document.addEventListener('DOMContentLoaded', () => {
          document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
          //send any queued messages
          getEventQ().forEach((msg) => {
            processQueueItem(msg);
          });
        });
      } else {
        document.dispatchEvent(new CustomEvent('fdc3Ready', {}));
        //send any queued messages
        getEventQ().forEach((msg) => {
          processQueueItem(msg);
        });
      }
    }
  });

  //prevent timing issues from very first load of the preload
  ipc.send(SAIL_TOPICS.INITIATE, {});

  const out = createDesktopAgentInstance(sendMessage, "1.2");

  return out;

};
