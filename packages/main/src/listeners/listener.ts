import { listeners as fdc33Listeners } from './fdc3Listeners';
import { Listener } from '../types/Listener';
import { ipcMain } from 'electron';
import { Runtime } from '../runtime';

import { FDC3Message } from '../types/FDC3Message';

export class RuntimeListener {
  runtime: Runtime;

  constructor(runtime: Runtime) {
    this.runtime = runtime;
    //start with clean IPC
    ipcMain.removeAllListeners();
  }

  listenForEvent(l: Listener) {
    const runtime = this.runtime;

    ipcMain.on(l.name, (event, args) => {
      l.handler.call(this, runtime, args as FDC3Message).then(
        (r) => {
          console.log('handler response', r, 'args', args);

          if (event.ports) {
            event.ports[0].postMessage({
              topic: args.data.eventId,
              data: r,
            });
          }
        },
        (err) => {
          console.log('handler error', err, 'args', args);

          if (event.ports) {
            event.ports[0].postMessage({
              topic: args.data.eventId,
              error: err,
            });
          }
        },
      );
    });
  }

  listen(): void {
    //the type of events we will listen for

    fdc33Listeners.forEach((l) => {
      this.listenForEvent(l);
    });
  }
}
