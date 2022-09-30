import { View } from './view';
import { getRuntime } from './index';
import { BrowserWindow } from 'electron';
import { FDC3App, IntentInstance, ResolverDetail } from './types/FDC3Data';
import { Context } from '@finos/fdc3';
import { join } from 'path';
import { Workspace } from './workspace';
import { randomUUID } from 'crypto';
import { RUNTIME_TOPICS } from './handlers/runtime/topics';

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
    this.id = randomUUID();

    this.intent = detail.intent;

    this.context = detail.context || null;

    this.window = new BrowserWindow({
      height: 400,
      width: 400,
      frame: false,
      show: false,
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
    //get the parent workspace (for positioning)
    const resolverHeight = 400;
    const resolverWidth = 400;

    //add resolution listener
    getRuntime().setResolver(this);

    //to do: position resolver in relation to view
    const RESOLVER_CONTENT =
      import.meta.env.DEV &&
      import.meta.env.VITE_DEV_SERVER_INTENTS_URL !== undefined
        ? import.meta.env.VITE_DEV_SERVER_INTENTS_URL
        : new URL(
            '../renderer/dist/intentResolver.html',
            'file://' + __dirname,
          ).toString();

    if (RESOLVER_CONTENT) {
      this.window.loadURL(RESOLVER_CONTENT as string).then(() => {
        const workspace: Workspace | undefined = view.parent;

        if (workspace && workspace.window) {
          const wsPosition = workspace.window?.getPosition();
          const wsSize = workspace.window?.getSize();
          this.window.setSize(resolverWidth, resolverHeight);
          this.window.setPosition(
            Math.round(wsPosition[0] + wsSize[0] / 2 - resolverWidth / 2),
            Math.round(wsPosition[1] + wsSize[1] / 2 - resolverHeight / 2),
          );
        }

        this.window.show();

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

        this.window.webContents.send(RUNTIME_TOPICS.WINDOW_START, startObject);

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
