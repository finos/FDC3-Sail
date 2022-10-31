import { FDC3Listener } from './types/FDC3Listener';
import { Context } from '@finos/fdc3';
import {
  FDC3App,
  IntentInstance,
  ChannelData,
  ResolverDetail,
} from '/@/handlers/fdc3/1.2/types/FDC3Data';
import { channels } from './system-channels';
import { View } from './view';
import { Workspace } from './workspace';
import { ViewConfig } from './types/ViewConfig';
import { WorkspaceConfig } from '/@/types/WorkspaceConfig';
import { ipcMain, IpcMainEvent } from 'electron';
import utils from './utils';
import { IntentResolver } from './IntentResolver';
import { RuntimeMessage } from './handlers/runtimeMessage';
import { register as registerRuntimeHandlers } from './handlers/runtime/index';
import { register as registerFDC3Handlers } from './handlers/fdc3/1.2/index';
import { FDC3Response } from './types/FDC3Message';
import { Directory } from './directory/directory';
import { fdc3_2_0_AppDirectoryLoader } from './directory/fdc3-20-loader';
import { fdc3_1_2_AppDirectoryLoader } from './directory/fdc3-12-loader';

// map of all running contexts keyed by channel
const contexts: Map<string, Array<Context>> = new Map([['default', []]]);

/**
 * map of all app / view instances
 * indexed by the webcontent id
 */
const views: Map<string, View> = new Map();

/**
 * map of all windows
 * indexed by the webcontent id
 */
const workspaces: Map<string, Workspace> = new Map();

//collection of app channel ids
let app_channels: Array<ChannelData> = [];

/**
 * map of all intent resolver dialogs
 */
//const resolvers: Map<string, IntentResolver> = new Map();
let resolver: IntentResolver | undefined = undefined;

export class Runtime {
  directory: Directory | null = null;

  // runtime : Runtime;

  //listener: RuntimeListener;

  startup() {
    //clear all previous Handlers
    ipcMain.removeAllListeners();

    //register handlers
    console.log('registering handlers');
    registerRuntimeHandlers(this);
    registerFDC3Handlers(this);
    console.log('done registering handlers');
    //create context state
    //initialize the active channels
    //need to map channel membership to tabs, listeners to apps, and contexts to channels
    channels.forEach((chan) => {
      //    contextListeners.set(chan.id, new Map());
      contexts.set(chan.id, []);
    });
    this.initDirectory();
  }

  initDirectory() {
    const urls = utils.getDirectoryUrl().split(',');
    this.directory = new Directory(urls, [
      fdc3_2_0_AppDirectoryLoader,
      fdc3_1_2_AppDirectoryLoader,
    ]);
    this.directory.reload();
  }

  getDirectory(): Directory {
    if (this.directory) {
      return this.directory;
    } else {
      throw Error('Directory not initialized');
    }
  }

  getWorkspace(workspaceId: string): Workspace | undefined {
    return this.getWorkspaces().get(workspaceId);
  }

  getWorkspaces() {
    return workspaces;
  }

  getViews() {
    return views;
  }

  getView(viewId: string): View | undefined {
    return this.getViews().get(viewId);
  }

  getContexts() {
    return contexts;
  }

  draggedTab: { tabId: string; source: string } | null = null;
  /**
   * Dynamically add a Handler to the IPC bus
   * @param name
   * @param handler
   * @param once
   */
  addHandler(
    name: string,
    handler: (args: RuntimeMessage) => Promise<unknown>,
    once?: boolean,
  ) {
    const theHandler = async (event: IpcMainEvent, args: RuntimeMessage) => {
      console.log('handle message', name, args);
      try {
        let r: FDC3Response;
        try {
          const result = await handler.call(undefined, args);
          r = {
            data: result,
          };
        } catch (err) {
          r = {
            error: (err as string) || 'unknown',
            data: null,
          };
        }
        console.log('message response', name, r);

        if (event.ports && args.eventId) {
          event.ports[0].postMessage({
            topic: args.eventId,
            data: r,
          });
        }
      } catch (err) {
        console.log('handler error', err, 'args', args);

        if (event.ports && args.eventId) {
          event.ports[0].postMessage({
            topic: args.eventId,
            error: err,
          });
        }
      }
    };

    if (once) {
      ipcMain.once(name, theHandler);
    } else {
      ipcMain.on(name, theHandler);
    }
  }

  dropHandler(name: string) {
    ipcMain.removeAllListeners(name);
  }

  /**
   *
   * drop all of the listeners for an app (when disconnecting)
   */
  /*  dropContextListeners(viewId : string) {
        //iterate through the listeners dictionary and delete any associated with the tab (appId)
        Object.keys(contextListeners.keys).forEach(channel =>{
            const channelMap = contextListeners.get(channel);
            channelMap.forEach((listener, key) => {
                if (listener.appId ===viewId){
                    channelMap.delete(key);
                }
            });
        }); 
    }*/

  setIntentListener(intent: string, listenerId: string, appId: string) {
    /*  if (!intentListeners.has(intent)){
            intentListeners.set(intent, new Map()); 
        }
        intentListeners.get(intent).set(listenerId, {appId:appId, listenerId:listenerId}); */
    const view = this.getView(appId);
    if (view) {
      view.listeners.push({
        viewId: appId,
        listenerId: listenerId,
        intent: intent,
      });
    }
  }

  /*
        return a map of context listeners keyed by channel
    */
  getContextListeners(): Map<string, Array<FDC3Listener>> {
    const result: Map<string, Array<FDC3Listener>> = new Map(); //intentListeners.get(intent);

    this.getViews().forEach((view) => {
      view.listeners.forEach((l: FDC3Listener) => {
        //if the listener doesn't have an intent, its a context listener
        if (!l.intent) {
          //resolve the channel, prefer the channel on the listener, or default to the channel of the view (if any)
          //or fallback to "default" channel
          const channel = l.channel || view.channel || 'default';
          if (!result.has(channel)) {
            result.set(channel, []);
          }
          const resultChannel = result.get(channel);
          if (resultChannel) {
            resultChannel.push(l);
          }
        }
      });
    });
    return result;
  }

  getIntentListeners(
    intent: string,
    target?: string,
  ): Map<string, FDC3Listener> {
    const result: Map<string, FDC3Listener> = new Map(); //intentListeners.get(intent);

    this.getViews().forEach((view) => {
      //if a target is provided, filter by the app name
      if (target) {
        if (view.directoryData && view.directoryData.name === target) {
          view.listeners.forEach((l) => {
            if (l.intent && l.intent === intent) {
              result.set(l.listenerId, l);
            }
          });
        }
      } else {
        view.listeners.forEach((l) => {
          if (l.intent && l.intent === intent) {
            result.set(l.listenerId, l);
          }
        });
      }
    });
    return result;
  }

  /**
   *
   * @param context - context type
   * @param target  - app identifier
   *
   * Returns a map of all Views with active intent listeners for a specific context type
   */
  getIntentListenersByContext(context: string): Map<string, Array<View>> {
    const result: Map<string, Array<View>> = new Map();

    //iterate through all registered apps
    //match on context for the intents for the entry
    this.getViews().forEach((view) => {
      const entry = view.directoryData;
      if (entry && entry.interop?.intents) {
        //iterate through the intents
        const listensFor = entry.interop?.intents.listensFor ?? {};
        Object.keys(listensFor).forEach((intent) => {
          const entryIntent = listensFor[intent];
          if (entryIntent.contexts.indexOf(context) > -1) {
            if (!result.has(intent)) {
              result.set(intent, []);
            }
            const listeners = result.get(intent);
            if (listeners) {
              listeners.push(view);
            }
          }
        });
      }
    });

    return result;
  }

  createView(url?: string, config?: ViewConfig): Promise<View> {
    return new Promise(() => {
      new Workspace({
        onInit: (workspace: Workspace) => {
          return new Promise((resolve, reject) => {
            try {
              const view = workspace.createView(url, config);
              resolve(view);
            } catch (err) {
              reject(err);
            }
          });
        },
      });
    });
  }

  createWorkspace(config?: WorkspaceConfig): Workspace {
    const workspace = new Workspace(config);

    //  workspaces.set(workspace.id,workspace);

    return workspace;
  }

  /**
   * Intent resolvers are tied to context (and positioning) of the view from where the intent is raised
   * A view can have only one intent resolver open at a time
   * each view can have resolvers open simultaneously
   * Note: although resolvers are linked to views and opened / closed from the context of a view, they are controled entirely by the main process.
   **/
  openResolver(
    detail: ResolverDetail,
    view: View,
    options: Array<FDC3App> | Array<IntentInstance>,
  ): IntentResolver {
    return new IntentResolver(view, detail, options);
  }

  getResolver(): IntentResolver | undefined {
    return resolver;
  }

  setResolver(newResolver: IntentResolver) {
    resolver = newResolver;
  }

  dropResolver() {
    resolver = undefined;
  }

  getAppChannels(): Array<ChannelData> {
    return app_channels;
  }

  setAppChannel(channel: ChannelData) {
    app_channels.push(channel);
  }

  dropAppChannel(channelId: string) {
    app_channels = app_channels.filter((channel) => channel.id !== channelId);
  }

  //cleanup state of the runtime
  clean() {
    contexts.clear();
    views.clear();
    workspaces.clear();
    resolver = undefined;
  }
}
