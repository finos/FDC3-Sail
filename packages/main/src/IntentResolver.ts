import { View } from './view';
import { getRuntime } from './index';
import { BrowserWindow } from 'electron';
import { FDC3App, IntentInstance, ResolverDetail } from './types/FDC3Data';
import { Context } from '@finos/fdc3';
import utils from './utils';
import { join } from 'path';
import { TOPICS } from './constants';

const RESOLVER_PRELOAD = join(
  __dirname,
  '../../preload/dist/intentResolver/index.cjs',
);

const devTools = false;

export class IntentResolver {
  window: BrowserWindow;

  view: View | null = null;

  id: string;

  intent: string | undefined;

  context: Context | null;

  constructor(
    view: View,
    detail: ResolverDetail,
    options?: Array<FDC3App> | Array<IntentInstance>,
  ) {
    this.id = utils.guid();

    this.intent = detail.intent;

    this.context = detail.context || null;

    this.window = new BrowserWindow({
      height: 400,
      width: 400,
      frame: false,
      hasShadow: true,
      resizable: false,
      webPreferences: {
        preload: RESOLVER_PRELOAD,
        webSecurity: true,
        nodeIntegration: true,
        contextIsolation: false,
        devTools: devTools,
      },
    });

    //TO DO: refactor bounds and positioning for multi-screen
    const vBounds = view.content.getBounds();
    console.log('Resolver vBounds', JSON.stringify(vBounds));
    const x =
      vBounds && vBounds.width ? vBounds.x + (vBounds.width + 200) / 2 : 0;
    const y = vBounds && vBounds.height ? (vBounds.y + vBounds.height) / 2 : 0;
    console.log('opening intentResolver @', x, y, vBounds);
    this.window.setBounds({
      x: Math.round(x),
      y: Math.round(y),
      height: 400,
      width: 400,
    });

    //add resolution listener
    getRuntime().setResolver(this);

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
    console.log('resolver content', RESOLVER_CONTENT);

    if (RESOLVER_CONTENT) {
      this.window.loadURL(RESOLVER_CONTENT as string).then(() => {
        if (devTools) {
          this.window.webContents.openDevTools();
        }
        console.log('resolver Window loaded');

        const startObject = {
          id: this.id,
          intent: this.intent || '',
          context: this.context,
          options: options,
        };

        console.log(
          'startObject',
          this.id,
          this.intent,
          JSON.stringify(this.context),
        );

        console.log('startObject options', JSON.stringify(options));

        this.window.webContents.send(TOPICS.WINDOW_START, startObject);

        console.log(
          'intent resolver create',
          RESOLVER_CONTENT as string,
          options,
        );
        this.view = view;
      });

      this.window.focus();

      //dev tools will automatically blur and close the resolver
      if (!devTools) {
        this.window.on('blur', () => {
          this.window.destroy();
        });
      }
    }
  }

  close() {
    this.window.destroy();
    getRuntime().dropResolver();
  }
}
