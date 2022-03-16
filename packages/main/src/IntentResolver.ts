import { View } from './view';
import { getRuntime } from './index';
import { BrowserWindow } from 'electron';
import { FDC3App, ResolverDetail } from './types/FDC3Data';
import { Context } from '@finos/fdc3';
import utils from './utils';
import { join } from 'path';
import { TOPICS } from './constants';

const RESOLVER_PRELOAD = join(
  __dirname,
  '../../preload/dist/intentResolver/index.cjs',
);

export class IntentResolver {
  window: BrowserWindow;

  view: View | null = null;

  id: string;

  intent: string;

  context: Context | null;

  constructor(view: View, detail: ResolverDetail, options?: Array<FDC3App>) {
    this.id = utils.guid();

    this.intent = detail.intent;

    this.context = detail.context || null;

    this.window = new BrowserWindow({
      height: 400,
      width: 400,
      frame: false,
      hasShadow: true,
      webPreferences: {
        preload: RESOLVER_PRELOAD,
        webSecurity: true,
        nodeIntegration: true,
        contextIsolation: false,
        devTools: true,
      },
    });

    //TO DO: refactor bounds and positioning for multi-screen
    const vBounds = view.content.getBounds();
    const x =
      vBounds && vBounds.width ? vBounds.x + (vBounds.width + 200) / 2 : 0;
    const y = vBounds && vBounds.height ? (vBounds.y + vBounds.height) / 2 : 0;
    console.log('opening intentResolver @', x, y, vBounds);
    this.window.setBounds({
      x: x,
      y: y,
    });

    //add resolution listener
    getRuntime().getResolvers().set(this.id, this);

    //to do: position resolver in relation to view

    const RESOLVER_CONTENT =
      import.meta.env.DEV &&
      import.meta.env.VITE_DEV_SERVER_INTENTS_URL !== undefined
        ? import.meta.env.VITE_DEV_SERVER_INTENTS_URL
        : new URL(
            '../../renderer/dist/intentResolver.html',
            'file://' + __dirname,
          ).toString();
    // and load the index.html of the app.
    if (RESOLVER_CONTENT) {
      this.window.loadURL(RESOLVER_CONTENT as string).then(() => {
        // this.window.webContents.openDevTools();
        this.window.webContents.send(TOPICS.WINDOW_START, {
          id: this.id,
          intent: this.intent,
          context: this.context,
          options: options,
        });

        console.log(
          'intent resolver create',
          RESOLVER_CONTENT as string,
          options,
        );
        this.view = view;
      });

      this.window.focus();

      this.window.on('blur', () => {
        this.window.destroy();
      });
    }
  }

  close() {
    this.window.close();
    getRuntime().getResolvers().delete(this.id);
  }
}
