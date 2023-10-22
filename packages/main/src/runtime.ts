import { FDC3Listener } from './types/FDC3Listener';
import { Context, AppIdentifier } from '@finos/fdc3';
import { FDC3App, IntentInstance, ResolverDetail } from '/@/types/FDC3Data';
import { systemChannels } from '/@/handlers/fdc3/lib/systemChannels';
import { View } from './view';
import { Workspace } from './workspace';
import { ViewConfig } from './types/ViewConfig';
import { WorkspaceConfig } from '/@/types/WorkspaceConfig';
import { ipcMain, IpcMainEvent } from 'electron';
import utils, { guid } from './utils';
import { IntentResolver } from './IntentResolver';
import { RuntimeMessage } from './handlers/runtimeMessage';
import { register as registerRuntimeHandlers } from './handlers/runtime/index';
import { Directory } from './directory/directory';
import { fdc3_2_0_AppDirectoryLoader } from './directory/fdc3-20-loader';
import { register as registerFDC3_2_0_Handlers } from './handlers/fdc3/2.0/index';
import { register as registerFDC3_1_2_Handlers } from './handlers/fdc3/1.2/index';
import { setRuntimeSecurityRestrictions } from './security-restrictions';
import { ChannelData, PrivateChannelData } from './types/Channel';
import { IntentTransfer, ContextTransfer } from '/@/types/TransferInstance';
import {
  SessionState,
  ViewState,
  WorkspaceState,
  ChannelState,
} from '/@/types/SessionState';

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
const appChannels: Map<string, ChannelData> = new Map();

const privateChannels: Map<string, PrivateChannelData> = new Map();

//collection of pending intent results
const intentResults: Map<
  string,
  Promise<ChannelData | Context | null>
> = new Map();
const intentResultResolvers: Map<
  string,
  (value: ChannelData | Context | null) => void
> = new Map();

const intentTransfers: Map<string, IntentTransfer> = new Map();
const contextTransfers: Map<string, ContextTransfer> = new Map();

/**
 * map of all intent resolver dialogs
 */
//const resolvers: Map<string, IntentResolver> = new Map();
let resolver: IntentResolver | undefined = undefined;

export class Runtime {
  directory: Directory | null = null;

  // runtime : Runtime;

  //listener: RuntimeListener;

  async startup() {
    //clear all previous Handlers
    ipcMain.removeAllListeners();

    //register handlers
    console.log('registering handlers');
    registerRuntimeHandlers(this);
    registerFDC3_2_0_Handlers(this);
    registerFDC3_1_2_Handlers(this);
    console.log('done registering handlers');
    //create context state
    //initialize the active channels
    //need to map channel membership to tabs, listeners to apps, and contexts to channels
    systemChannels.forEach((chan) => {
      //    contextListeners.set(chan.id, new Map());
      contexts.set(chan.id, []);
    });
    await this.initDirectory();
    setRuntimeSecurityRestrictions(this);
    return;
  }

  async initDirectory() {
    const urls = utils.getDirectoryUrl().split(',');
    this.directory = new Directory(urls, [fdc3_2_0_AppDirectoryLoader]);
    await this.directory.reload();
  }

  getDirectory(): Directory {
    if (this.directory) {
      const out = this.directory;
      return out;
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

  getSessionState(): SessionState {
    const viewStates: Array<ViewState> = [];
    const viewsMap: { [key: string]: Array<string> } = {};
    const workspaceStates: Array<WorkspaceState> = [];
    const channelStates: Array<ChannelState> = [];

    const toViewState = (view: View) => {
      return {
        id: view.id,
        parent: view.parent ? view.parent.id : '',
        fdc3Version: view.fdc3Version,
        url: view.content.webContents.getURL(),
        title: view.getTitle(),
        channel: view.channel || '',
        directoryData: view.directoryData || null,
      };
    };

    const vMap: Map<string, Array<string>> = new Map();
    views.forEach((view) => {
      //is it a system view?
      if (view.isSystemView()) {
        if (!vMap.has('system views')) {
          vMap.set('system views', []);
        }
        vMap.get('system views')?.push(view.id);
      } else if (view.directoryData && view.directoryData.appId) {
        //is there an array for the view id?
        if (!vMap.has(view.directoryData.appId)) {
          vMap.set(view.directoryData.appId, []);
        }
        vMap.get(view.directoryData.appId)?.push(view.id);
      } else {
        if (!vMap.has('ad hoc views')) {
          vMap.set('ad hoc views', []);
        }
        vMap.get('ad hoc views')?.push(view.id);
      }

      vMap.forEach((views: Array<string>, key: string) => {
        viewsMap[key] = views;
      });
    });

    views.forEach((view) => {
      viewStates.push(toViewState(view));
    });

    workspaces.forEach((workspace) => {
      workspaceStates.push({
        id: workspace.id,
        channel: workspace.channel || '',
        views: workspace.views.map((v) => {
          return v.id;
        }),
      });
    });

    //combine the user / system channels and app channels
    const allChannels = systemChannels;
    //mixin the appChannels
    appChannels.forEach((channel) => {
      allChannels.push(channel);
    });

    allChannels.forEach((channel: ChannelData) => {
      const channelContext = contexts.get(channel.id) || [];

      channelStates.push({
        channel: channel,
        contexts: channelContext,
      });
    });

    return {
      views: viewStates,
      viewsMap: viewsMap,
      workspaces: workspaceStates,
      channels: channelStates,
    };
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
      //  console.log('handle message', name, args);

      let error: string | undefined = undefined;
      let data: unknown;
      try {
        data = await handler.call(undefined, args);
      } catch (err) {
        error = (err as string) || 'unknown';
        data = null;
      }

      if (event.ports && args.eventId) {
        event.ports[0].postMessage({
          topic: args.eventId,
          data: data,
          error: error,
        });
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

  getIntentListenersByAppName(
    intent: string,
    name: string,
  ): Map<string, FDC3Listener> {
    const result: Map<string, FDC3Listener> = new Map(); //intentListeners.get(intent);

    this.getViews().forEach((view) => {
      //if a target is provided, filter by the app name

      if (view.directoryData && view.directoryData.name === name) {
        view.listeners.forEach((l) => {
          if (l.intent && l.intent === intent) {
            result.set(l.listenerId, l);
          }
        });
      }
    });
    return result;
  }

  getIntentListenersByAppId(
    intent: string,
    id: AppIdentifier,
  ): Map<string, FDC3Listener> {
    const result: Map<string, FDC3Listener> = new Map(); //intentListeners.get(intent);

    this.getViews().forEach((view) => {
      //if a appIdentifier target is provided, filter
      //to do - instance targeting
      if (view.directoryData && view.directoryData.appId === id.appId) {
        view.listeners.forEach((l) => {
          if (l.intent && l.intent === intent) {
            result.set(l.listenerId, l);
          }
        });
      }
    });
    return result;
  }

  getIntentListeners(intent: string): Map<string, FDC3Listener> {
    const result: Map<string, FDC3Listener> = new Map(); //intentListeners.get(intent);

    this.getViews().forEach((view) => {
      view.listeners.forEach((l) => {
        if (l.intent && l.intent === intent) {
          result.set(l.listenerId, l);
        }
      });
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
    return new Promise((resolve, reject) => {
      try {
        const workspace = this.createWorkspace();
        resolve(workspace.createView(url, config));
      } catch (err) {
        reject(err);
      }
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

  getAppChannel(id: string): ChannelData | undefined {
    return appChannels.get(id);
  }

  setAppChannel(channel: ChannelData) {
    appChannels.set(channel.id, channel);
  }

  dropAppChannel(channelId: string) {
    appChannels.delete(channelId);
  }

  setPrivateChannel(channel: PrivateChannelData) {
    privateChannels.set(channel.id, channel);
  }

  getPrivateChannel(id: string): PrivateChannelData | undefined {
    return privateChannels.get(id);
  }

  dropPrivateChannel(channelId: string) {
    privateChannels.delete(channelId);
  }

  //creates new entry in intentResults collection and returns the generated id
  initIntentResult(): string {
    const id = guid();
    intentResults.set(
      id,
      new Promise((resolve) => {
        console.log('************** initIntentResult saves the Promise', id);
        // The result is a Promise that will be resolved when the result is saved in 'setIntentResult' method
        intentResultResolvers.set(id, resolve);
      }),
    );
    return id;
  }

  //one time sets the result (no op if the result is not null)
  setIntentResult(id: string, result: ChannelData | Context | null) {
    console.log('************** set intent result', id, result);
    const entry = intentResults.get(id);
    if (entry === null) {
      intentResults.set(id, Promise.resolve(result));
    } else {
      // We resolved the promise saved in intentResults by calling the resolve method
      const resolver = intentResultResolvers.get(id);
      if (resolver) {
        console.log('************** setIntentResult resolves the Promise', id);
        resolver(result);
        intentResultResolvers.delete(id);
      }
    }
  }

  //one time returns the result, then deletes the entry if not null
  async getIntentResult(id: string): Promise<Context | ChannelData | null> {
    const result = await intentResults.get(id);
    if (result === undefined || result === null) {
      return null;
    } else {
      intentResults.delete(id);
      return result;
    }
  }

  createIntentTransfer(
    source: string,
    intent: string,
    context?: Context,
  ): IntentTransfer {
    const id = guid();
    const transfer = new IntentTransfer(id, source, intent, context);
    intentTransfers.set(id, transfer);
    return transfer;
  }

  createContextTransfer(source: string, context: Context): ContextTransfer {
    const id = guid();
    const transfer = new ContextTransfer(id, source, context);
    contextTransfers.set(id, transfer);
    return transfer;
  }

  //cleanup state of the runtime
  clean() {
    contexts.clear();
    views.clear();
    workspaces.clear();
    resolver = undefined;
  }
}
