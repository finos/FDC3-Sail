import { RuntimeListener } from './listeners/listener';
import { FDC3Listener } from './types/FDC3Listener';
import { Context } from '@finos/fdc3';
import { FDC3App, IntentInstance, ResolverDetail } from './types/FDC3Data';
import { channels } from './system-channels';
import { View } from './view';
import { Workspace } from './workspace';
import { ViewConfig } from './types/ViewConfig';
import { WorkspaceConfig } from './types/WorkspaceConfig';
import { net } from 'electron';
import utils from './utils';
import { IntentResolver } from './IntentResolver';

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

/**
 * map of all intent resolver dialogs
 */
//const resolvers: Map<string, IntentResolver> = new Map();
let resolver: IntentResolver | undefined = undefined;

export class Runtime {
  constructor() {
    console.log('create runtime');
    //initialize contexts
    //set up listeners

    //create context state
    //initialize the active channels
    //need to map channel membership to tabs, listeners to apps, and contexts to channels
    channels.forEach((chan) => {
      //    contextListeners.set(chan.id, new Map());
      contexts.set(chan.id, []);
    });

    this.listener = new RuntimeListener(this);
    this.listener.listen();
  }

  // runtime : Runtime;

  listener: RuntimeListener;

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
    console.log('getView ', viewId);
    return this.getViews().get(viewId);
  }

  getContexts() {
    return contexts;
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
      if (entry && entry.intents) {
        //iterate through the intents
        entry.intents.forEach((entryIntent) => {
          const intent = entryIntent.name;
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

  fetchFromDirectory(query: string): Promise<any> {
    return new Promise((resolve, reject) => {
      utils.getDirectoryUrl().then((directoryUrl) => {
        const url = `${directoryUrl}${query}`;
        const request = net.request(url);

        const resultBuffer: Array<string> = [];
        try {
          request.on('response', (response) => {
            response.on('data', (chunk) => {
              resultBuffer.push(chunk.toString());
            });
            response.on('end', () => {
              resolve(JSON.parse(resultBuffer.join('')));
            });
            response.on('error', () => {
              reject();
            });
          });
          request.end();
        } catch (err) {
          reject(err);
        }
      });
    });
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
}
