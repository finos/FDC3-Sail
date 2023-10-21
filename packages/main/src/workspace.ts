/**
 *  A Workspace wraps a BrowserWindow instance, containing any number of Views (BrowserViews containing AppInstances)
 *
 *  Workspaces have:
 *     - Toolbars
 *     - Channel membership
 *     - ultimately, management abilities like save & restore, etc
 */

import { WorkspaceConfig } from './types/WorkspaceConfig';
import { ViewConfig } from './types/ViewConfig';
import { View } from './view';
import { getRuntime } from './index';
import { Rectangle } from 'electron';
import { BrowserWindow } from 'electron';
//import { joinViewToChannel } from '/@/handlers/runtime/channelPicker';
import { join } from 'path';
import {
  DEFAULT_WINDOW_HEIGHT,
  DEFAULT_WINDOW_WIDTH,
  TOOLBAR_HEIGHT,
  TOPICS,
} from './constants';
import { randomUUID } from 'crypto';
import { RUNTIME_TOPICS } from '/@/handlers/runtime/topics';
import { FDC3_1_2_TOPICS } from '/@/handlers/fdc3/1.2/topics';
import { FDC3_2_0_TOPICS } from '/@/handlers/fdc3/2.0/topics';

const SYSTEM_PRELOAD = join(__dirname, '../../preload/dist/system/index.cjs');

/*
const CHANNEL_PICKER_PRELOAD = join(
  __dirname,
  '../../preload/dist/channelPicker/index.cjs',
);

const SEARCH_RESULTS_PRELOAD = join(
  __dirname,
  '../../preload/dist/searchResults/index.cjs',
);*/

const CHANNEL_WINDOW_WIDTH = 140;
const CHANNEL_WINDOW_HEIGHT = 100;

export class Workspace {
  constructor(config?: WorkspaceConfig) {
    this.id = randomUUID();

    this.window = new BrowserWindow({
      // show: false, // Use 'ready-to-show' event to show window
      height: DEFAULT_WINDOW_HEIGHT,
      width: DEFAULT_WINDOW_WIDTH,
      titleBarStyle: 'hiddenInset',
      trafficLightPosition: { x: 17, y: 17 },
      webPreferences: {
        webviewTag: false, // The webview tag is not recommended. Consider alternatives like iframe or Electron's BrowserView. https://www.electronjs.org/docs/latest/api/webview-tag#warning
        preload: SYSTEM_PRELOAD,
        nodeIntegration: true,
      },
    });

    this.window.on('close', () => {
      this.views.forEach((view) => {
        view.close();
      });
    });

    if (config && config.x && config.y) {
      this.window.setBounds({
        x: config.x,
        y: config.y,
      });
    }

    const TOP_NAVIGATION_CONTENT =
      import.meta.env.DEV &&
      import.meta.env.VITE_DEV_SERVER_TOPNAVIGATION_URL !== undefined
        ? import.meta.env.VITE_DEV_SERVER_TOPNAVIGATION_URL
        : new URL(
            '../renderer/dist/topNavigation.html',
            'file://' + __dirname,
          ).toString();

    // and load the index.html of the app.
    if (this.window && TOP_NAVIGATION_CONTENT) {
      this.window.loadURL(TOP_NAVIGATION_CONTENT).then(() => {
        if (this.window) {
          this.window.webContents.send(RUNTIME_TOPICS.WINDOW_START, {
            id: this.id,
          });

          console.log('workspace created', this.id);
          const runtime = getRuntime();
          if (runtime) {
            runtime.getWorkspaces().set(this.id, this);

            this.window.on('resize', () => {
              if (this.window) {
                const bounds: Rectangle = this.window.getBounds();
                this.views.forEach((v) => {
                  v.content.setBounds({
                    x: 0,
                    y: TOOLBAR_HEIGHT,
                    width: bounds.width,
                    height: bounds.height - TOOLBAR_HEIGHT,
                  });
                });
              }
            });

            //listen for the view closing, unregister listeners
            //TODO: cleanup the whole workspace
            this.window.on('close', () => {
              this.close();
            });

            //call onInit handler, if in the config
            if (config && config.onInit) {
              config.onInit.call(this, this);
            }
          }
        }
      });
    }
  }

  window: BrowserWindow | null = null;

  resultsWindow: BrowserWindow | null = null;

  channelWindow: BrowserWindow | null = null;

  views: Array<View> = [];

  id: string;

  resultsId: string | null = null;

  channel: string | null = null;

  /**
   * the currently selected / in view tab
   */
  selectedTab: string | null = null;

  getSelectedIndex(): number {
    return this.views.findIndex((v) => {
      return v.id === this.selectedTab;
    });
  }

  setSelectedTab(tabId: string, suppressFocus?: boolean) {
    console.log('setSelectedTab');
    const runtime = getRuntime();
    if (runtime) {
      //set new selected state and show new selected view
      console.log('setSelectedTab tabId', tabId);
      this.selectedTab = tabId;
      //ensure the view still exists
      const view = runtime.getView(this.selectedTab);
      if (view) {
        try {
          if (this.window) {
            //ensure the browserview is actually attached to the window
            this.window.addBrowserView(view.content);
            // setTimeout(() => {
            if (this.window) {
              try {
                console.log('setting top browser view');
                this.window.setTopBrowserView(view.content);
                this.window.webContents.send(TOPICS.SELECT_TAB, {
                  viewId: tabId,
                });
                //focus the workspace window?
                if (!suppressFocus) {
                  this.window.focus();
                }
              } catch (err) {
                console.error('setSelectedTab', err);
              }
            }
            // }, 300);
          }
        } catch (err) {
          console.warn('setSelectedTab', err);
        }
      }
    }
  }

  /**
   *
   * close the workspace
   */
  close() {
    console.log('closing workspace');
    const runtime = getRuntime();
    this.getViews().forEach((view) => {
      view.close();
    });

    //destroy results window
    if (this.resultsWindow) {
      this.resultsWindow.destroy();
    }

    //destroy the channel window
    if (this.channelWindow) {
      this.channelWindow.destroy();
    }

    //close the window
    if (this.window) {
      //this.window.close();
      console.log('closing the browser window');
      this.window.destroy();
    }

    //unregister workspace
    if (runtime) {
      runtime.getWorkspaces().delete(this.id);
    }
  }

  /**
   * close a tab
   * @param tabId
   */

  closeTab(tabId: string) {
    const runtime = getRuntime();
    if (runtime) {
      const view = runtime.getView(tabId);
      const newSelection: boolean = tabId === this.selectedTab;
      let selectedIndex = -1;
      //remove the view from the workspace
      this.views = this.views.filter((v, i) => {
        if (v.id === this.selectedTab) {
          selectedIndex = i;
        }
        return v.id !== tabId;
      });
      //close the view, this removes from the runtime collection and cleans up
      if (view) {
        view.close();
      }
      //are there more tabs?
      //if not, close the workspace
      console.log('close tab views ', this.views.length);
      if (this.views.length === 0) {
        this.close();
      } else if (newSelection) {
        //if the removed tashift the selected tab to the left
        selectedIndex--;
        //select the next tab if the closed tab was selected
        if (selectedIndex > -1) {
          //if we're down to 1 tab, force selected index to 0
          console.log(
            'selectedIndex ',
            selectedIndex,
            'views length ',
            this.views.length,
          );
          selectedIndex = this.views.length === 0 ? 0 : selectedIndex;
          selectedIndex =
            this.views.length === selectedIndex
              ? selectedIndex - 1
              : selectedIndex;
          console.log('selectedIndex ', selectedIndex);
          const selectedView = this.views[selectedIndex];
          if (selectedView) {
            this.setSelectedTab(selectedView.id);
          }
        }
      }
    }
  }

  removeTab(tabId: string, suppressFocus?: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log('removeTab');
      try {
        //to do : clear all handlers and workspace bindings
        const runtime = getRuntime();
        if (runtime) {
          let selectedIndex = -1;
          //if we're removing the currently selected tab, then we'll have to make a new selection
          const newSelection: boolean = tabId === this.selectedTab;
          //remove the view from the workspace
          console.log('removing tab.  current # of views', this.views.length);

          this.views = this.views.filter((v, i) => {
            if (v.id === tabId) {
              selectedIndex = i;
              //remove view parent
              delete v.parent;
              if (this.window) {
                this.window.removeBrowserView(v.content);
              }
            }
            return v.id !== tabId;
          });

          console.log('removing tab.  current # of views', this.views.length);
          //are there more tabs?
          //if not, close the workspace
          if (this.views.length === 0) {
            this.close();
            resolve();
          } else if (newSelection) {
            //if the removed tab was selected, shift the selected tab to the left
            selectedIndex--;

            if (selectedIndex > -1) {
              //if we're down to 1 tab, force selected index to 0
              console.log(
                'selectedIndex ',
                selectedIndex,
                'views length ',
                this.views.length,
              );
              selectedIndex = this.views.length === 1 ? 0 : selectedIndex;

              const selectedView = this.views[selectedIndex];
              if (selectedView) {
                console.log('remove tab - selectedView = ', selectedView.id);
                this.setSelectedTab(selectedView.id, suppressFocus);
                if (this.window) {
                  this.window.webContents.send('WORK:selectTab', {
                    viewId: selectedView.id,
                  });
                }
                resolve();
              } else {
                console.log('remove tab - no selectedView');
                resolve();
              }
            }
          } else if (this.selectedTab) {
            //just reselect the already selected tab
            this.setSelectedTab(this.selectedTab);
            if (this.window) {
              this.window.webContents.send(TOPICS.SELECT_TAB, {
                viewId: this.selectedTab,
              });
            }
            resolve();
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  joinViewToChannel(channel: string, view: View): Promise<void> {
    return new Promise((resolve, reject) => {
      const runtime = getRuntime();
      try {
        //get the previous channel
        const prevChan = view.channel || 'default';
        //are the new channel and previous the same?  then no-op...
        if (prevChan !== channel) {
          //update channel membership on view
          view.channel = channel;

          //push current channel context
          //if there is a context...
          const contexts = runtime.getContexts();
          const channelContext = contexts.get(channel);

          //ensure the channel state for the view's workspace is updated
          if (view.parent) {
            const sourceWS = runtime.getWorkspace(view.parent.id);
            //setChannel will result in calling joinViewToChannel again,
            //so we are going to no op if that is the case
            //which would mean that 'joinChannel' has been called programtically from the fdc3 api
            if (sourceWS && sourceWS.channel !== channel) {
              sourceWS.setChannel(channel);
            } else {
              if (channelContext) {
                const ctx =
                  channelContext.length > 0 ? channelContext[0] : null;
                let contextSent = false;

                // send to individual listenerIds

                view.listeners.forEach((l) => {
                  //if this is not an intent listener, and not set for a specific channel, and not set for a non-matching context type  - send the context to the listener
                  if (!l.intent) {
                    if (
                      (!l.channel ||
                        l.channel === 'default' ||
                        (l.channel && l.channel === channel)) &&
                      (!l.contextType ||
                        (l.contextType && ctx && l.contextType === ctx.type))
                    ) {
                      const contextTopic =
                        view.fdc3Version === '1.2'
                          ? FDC3_1_2_TOPICS.CONTEXT
                          : FDC3_2_0_TOPICS.CONTEXT;
                      view.content.webContents.send(contextTopic, {
                        topic: 'context',
                        listenerIds: [l.listenerId],
                        data: { context: ctx, listenerId: l.listenerId },
                        source: view.id,
                      });
                      contextSent = true;
                    }
                  }
                });
                if (!contextSent) {
                  //note: the source for this context is the view itself - since this was the result of being joined to the channel (not context being broadcast from another view)
                  console.log(
                    'setPendingContext',
                    channelContext && channelContext[0],
                  );
                  view.setPendingContext(channelContext && channelContext[0]);
                }
              }
            }
          }
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }

  createResultsWindow(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.resultsWindow = new BrowserWindow({
        height: 100,
        width: 370,
        hasShadow: true,
        show: false,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
          webSecurity: true,
          nodeIntegration: true,
          contextIsolation: true,
          preload: SYSTEM_PRELOAD,
        },
      });

      const SEARCH_RESULTS_CONTENT =
        import.meta.env.DEV &&
        import.meta.env.VITE_DEV_SERVER_SEARCH_URL !== undefined
          ? import.meta.env.VITE_DEV_SERVER_SEARCH_URL
          : new URL(
              '../renderer/dist/searchResults.html',
              'file://' + __dirname,
            ).toString();

      if (SEARCH_RESULTS_CONTENT && this.resultsWindow) {
        this.resultsWindow.loadURL(SEARCH_RESULTS_CONTENT as string).then(
          () => {
            if (this.resultsWindow) {
              this.resultsWindow.webContents.send(RUNTIME_TOPICS.WINDOW_START, {
                workspaceId: this.id,
              });
              console.log('results window created', this.resultsId);
              //this.resultsWindow.webContents.openDevTools();
              resolve();
            }
          },
          (err: Error) => {
            reject(err);
          },
        );
      }
    });
  }

  /**
   * create a developer view of the Session State
   */
  async createSessionView(): Promise<void> {
    const VIEW_PATH =
      import.meta.env.DEV &&
      import.meta.env.VITE_DEV_SERVER_SESSION_URL !== undefined
        ? import.meta.env.VITE_DEV_SERVER_SESSION_URL
        : new URL(
            '../renderer/dist/sessionView.html',
            'file://' + __dirname,
          ).toString();

    this.createView(VIEW_PATH, {
      workspace: this,
      isSystem: true,
      title: 'Session View',
    });
    return;
  }

  createChannelWindow(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.channelWindow = new BrowserWindow({
        height: CHANNEL_WINDOW_HEIGHT,
        width: CHANNEL_WINDOW_WIDTH,
        hasShadow: true,
        show: false,
        frame: false,
        alwaysOnTop: true,
        webPreferences: {
          webSecurity: true,
          nodeIntegration: true,
          contextIsolation: true,
          preload: SYSTEM_PRELOAD,
        },
      });
      const CHANNEL_PICKER_CONTENT =
        import.meta.env.DEV &&
        import.meta.env.VITE_DEV_SERVER_CHANNEL_URL !== undefined
          ? import.meta.env.VITE_DEV_SERVER_CHANNEL_URL
          : new URL(
              '../renderer/dist/channelPicker.html',
              'file://' + __dirname,
            ).toString();

      if (CHANNEL_PICKER_CONTENT) {
        this.channelWindow.loadURL(CHANNEL_PICKER_CONTENT as string).then(
          () => {
            if (this.channelWindow) {
              this.channelWindow.webContents.send(RUNTIME_TOPICS.WINDOW_START, {
                workspaceId: this.id,
              });
              resolve();
            }
          },
          (err) => {
            reject(err);
          },
        );
      }
    });
  }

  async showChannelWindow(xOffset?: number, yOffset?: number) {
    if (!this.channelWindow) {
      await this.createChannelWindow();
    }
    if (this.channelWindow) {
      this.channelWindow.webContents.send(TOPICS.WINDOW_SHOW, {
        selectedChannel: this.channel,
      });
      const winPos: number[] = this.window ? this.window.getPosition() : [0, 0];
      this.channelWindow.setPosition(
        winPos[0] + ((xOffset || 0) - CHANNEL_WINDOW_WIDTH),
        winPos[1] + (yOffset || 0),
      );
      this.channelWindow.show();
      this.channelWindow.focus();
      this.channelWindow.on('blur', () => {
        this.hideChannelWindow();
      });
    }
  }

  hideChannelWindow() {
    if (this.channelWindow) {
      this.channelWindow.hide();
    }
  }

  async loadSearchResults(results: Array<object>) {
    if (!this.resultsWindow) {
      await this.createResultsWindow();
    }
    if (this.resultsWindow) {
      const winPos: number[] = this.window ? this.window.getPosition() : [0, 0];
      this.resultsWindow.setSize(370, 80 + results.length * 20, false);

      this.resultsWindow.setPosition(winPos[0] + 9, winPos[1] + 70);

      this.resultsWindow.showInactive();
      this.resultsWindow.webContents.send(RUNTIME_TOPICS.SEARCH_LOAD_RESULTS, {
        results: results,
      });

      let hideTimer: NodeJS.Timeout | null = null;

      //clear previous handlers
      this.resultsWindow.removeAllListeners();

      this.resultsWindow.on('focus', () => {
        if (hideTimer) {
          clearTimeout(hideTimer);
        }
      });

      this.resultsWindow.on('blur', () => {
        hideTimer = setTimeout(() => {
          this.hideSearchResults();
        }, 1000);
      });

      this.resultsWindow.focus();
    }
  }

  hideSearchResults() {
    if (this.resultsWindow) {
      this.resultsWindow.hide();
      this.resultsWindow.removeAllListeners();
    }
  }

  addTab(tabId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        //to do: add workspace handlers and bindings
        const runtime = getRuntime();
        if (runtime) {
          const view = runtime.getView(tabId);
          if (view) {
            //add to view collection
            if (this.window) {
              this.window.addBrowserView(view.content);

              view.parent = this;

              this.views.push(view);
              setTimeout(async () => {
                view.size();
                this.setSelectedTab(view.id);
                if (this.window) {
                  this.window.webContents.send(RUNTIME_TOPICS.ADD_TAB, {
                    viewId: view.id,
                    title: view.getTitle(),
                  });

                  if (this.channel && view.channel !== this.channel) {
                    await this.joinViewToChannel(this.channel, view);
                  }
                  resolve();
                }
              }, 300);
            }
          }
        }
      } catch (err) {
        reject(err);
      }
    });
  }

  createView(url?: string, config?: ViewConfig): View {
    const conf = config || {};
    conf.workspace = this;
    const customReady = conf.onReady;
    conf.onReady = (view) => {
      console.log('view ready');
      this.views.push(view);

      return new Promise((resolve, reject) => {
        if (this.window) {
          if (customReady) {
            customReady.call(this, view);
          }
          console.log('adding tab', view.id, view.getTitle());

          this.window.webContents.send(RUNTIME_TOPICS.ADD_TAB, {
            viewId: view.id,
            title: view.getTitle(),
          });

          this.setSelectedTab(view.id);

          // this.window.addBrowserView(view.content);
          console.log('createView - join view to channel', url, this.channel);
          if (this.channel) {
            this.joinViewToChannel(this.channel, view).then(
              () => {
                resolve();
              },
              (err: Error) => {
                reject(err);
              },
            );
          } else {
            resolve();
          }
        } else {
          reject('No window exists');
        }
      });
    };

    const view = new View(url, conf, this, conf.version);

    //add to view collection
    if (this.window) {
      this.window.addBrowserView(view.content);
    }
    return view;
  }

  getViews(): Array<View> {
    return this.views;
  }

  /**
   * set the workspace - wide channel (apply to all views)
   */
  setChannel(channel: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.channel = channel;
        Promise.all(
          this.views.map(async (view) => {
            if (view.channel !== channel) {
              await this.joinViewToChannel(channel, view);
            }
          }),
        );

        if (this.channelWindow) {
          this.channelWindow.webContents.send(RUNTIME_TOPICS.CHANNEL_SELECTED, {
            channel: channel,
          });
        }

        if (this.window) {
          this.window.webContents.send(RUNTIME_TOPICS.CHANNEL_SELECTED, {
            channel: channel,
          });
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  }
}
