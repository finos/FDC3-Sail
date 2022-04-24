/**
 * A View wraps a BrowserView and has a specific AppInstance associated with it
 * Views have
 *    - Channel membership
 *    - Pending Context / Intent (?)
 */

import { ViewConfig } from './types/ViewConfig';
import { getRuntime } from './index';
import { BrowserView } from 'electron';
import { DirectoryApp } from './types/FDC3Data';
import { Context } from '@finos/fdc3';
import { Rectangle } from 'electron/main';
import { Workspace } from './workspace';
import { FDC3Listener } from './types/FDC3Listener';
import { Pending } from './types/Pending';
import { TOPICS } from './constants';
import { join } from 'path';
import { randomUUID } from 'crypto';

const VIEW_PRELOAD = join(__dirname, '../../preload/dist/view/index.cjs');

const HOME_PRELOAD = join(__dirname, '../../preload/dist/homeView/index.cjs');

const TOOLBAR_HEIGHT = 120;

export class View {
  constructor(url?: string | null, config?: ViewConfig, parent?: Workspace) {
    const VIEW_DEFAULT =
      import.meta.env.DEV &&
      import.meta.env.VITE_DEV_SERVER_DEFAULT_URL !== undefined
        ? import.meta.env.VITE_DEV_SERVER_DEFAULT_URL
        : new URL(
            '../renderer/dist/homeView.html',
            'file://' + __dirname,
          ).toString();

    const setId = () => {
      this.content.webContents.send(TOPICS.FDC3_START, {
        id: this.id,
        directory: this.directoryData || null,
      });
      this.initiated = true;
      console.log('view created', this.id, url);
      const runtime = getRuntime();
      if (runtime) {
        runtime.getViews().set(this.id, this);
      }
    };

    const initView = (config?: ViewConfig) => {
      const doInit = () => {
        setId();
        this.size();
        //call onInit handler, if in the config
        if (config && config.onReady) {
          config.onReady.call(this, this);
        }
      };

      doInit();
    };

    this.id = randomUUID();
    this.parent = parent;

    if (config) {
      this.directoryData = config.directoryData;
    }

    this.content = new BrowserView({
      webPreferences: {
        preload: url ? VIEW_PRELOAD : HOME_PRELOAD,
        devTools: true,
        contextIsolation: true,
        webSecurity: true,
        nodeIntegration: false,
      },
    });
    //set bgcolor so view doesn't bleed through to hidden tabs
    this.content.setBackgroundColor('#fff');

    this.content.webContents.on('ipc-message', (event, channel) => {
      console.log('ipc-message', event.type, channel);
      if (channel === TOPICS.FDC3_INITIATE && !this.initiated) {
        console.log('fdc3 initiating!');
        initView(config);
      }
    });

    //if no URL is defined - then this is the Home view and a system view
    if (!url) {
      url = VIEW_DEFAULT as string;
    }
    if (url === (VIEW_DEFAULT as string)) {
      this.type = 'system';
    }

    console.log('create view', url, this.type, config);

    if (url) {
      this.content.webContents.loadURL(url).then(() => {
        //   initView(config);
      });

      //listen for reloads and reset id
      this.content.webContents.on('devtools-reload-page', () => {
        this.content.webContents.once('did-finish-load', () => {
          this.content.webContents.send(TOPICS.FDC3_START, {
            id: this.id,
            directory: this.directoryData || null,
          });
          console.log('FDC3 restart', this.id);
        });
      });

      //listen for navigation
      //to do: ensure directory entry and new location match up!
      this.content.webContents.on('did-navigate', () => {
        this.content.webContents.once('did-finish-load', () => {
          this.content.webContents.send(TOPICS.FDC3_START, {
            id: this.id,
            directory: this.directoryData || null,
          });
          console.log('FDC3 restart', this.id);
        });
      });
    }
  }
  /**
   * size the view to the parent
   */
  size() {
    if (this.parent && this.parent.window) {
      const bounds: Rectangle = this.parent.window.getBounds();
      this.content.setBounds({
        x: 0,
        y: TOOLBAR_HEIGHT,
        width: bounds.width,
        height: bounds.height - TOOLBAR_HEIGHT,
      });
    } else {
      this.content.setBounds({
        x: 0,
        y: TOOLBAR_HEIGHT,
        width: 800,
        height: 500,
      });
    }
  }

  id: string;

  content: BrowserView;

  channel: string | null = null;

  /**
   * contexts that the view is listening to
   */
  listeners: Array<FDC3Listener> = [];

  /* array pending contexts
   */
  private pendingContexts: Array<Pending> = [];
  private pendingIntents: Array<Pending> = [];

  directoryData?: DirectoryApp;

  parent?: Workspace;

  initiated = false;

  private type: 'system' | 'app' = 'app';

  setPendingContext(context: Context, source?: string): void {
    console.log('view: set pending context', this.id, context);
    this.pendingContexts.push(
      new Pending(this.id, source || this.id, { context: context }),
    );
  }

  getPendingContexts(): Array<Pending> {
    console.log('view: get pending contexts', this.pendingContexts);
    return this.pendingContexts;
  }

  removePendingContext(index: number): void {
    try {
      this.pendingContexts.splice(index, 1);
    } catch (err) {
      console.log('removePendingContext - error', err);
    }
  }

  setPendingIntent(intent: string, context?: Context, source?: string): void {
    this.pendingIntents.push(
      new Pending(this.id, source || this.id, {
        intent: intent,
        context: context,
      }),
    );
  }

  getPendingIntents(): Array<Pending> {
    return this.pendingIntents;
  }

  removePendingIntent(index: number): void {
    try {
      this.pendingIntents.splice(index, 1);
    } catch (err) {
      console.log('removePendingContext - error', err);
    }
  }

  isSystemView = (): boolean => {
    console.log('isSystemView', this.type);
    return this.type === 'system';
  };

  getTitle(): string {
    //is it a system view?
    console.log('View getTitle', this.isSystemView());
    if (this.isSystemView()) {
      return 'Home';
    } else {
      return this.directoryData && this.directoryData.title
        ? this.directoryData.title
        : this.content.webContents.getTitle();
    }
  }

  close() {
    const runtime = getRuntime();
    if (this.parent && this.parent.window) {
      this.parent.window.removeBrowserView(this.content);
    }
    if (this.content) {
      this.content.webContents.closeDevTools();
    }
    //how do you destroy a browser view?
    if (runtime) {
      runtime.getViews().delete(this.id);
    }
  }
}
