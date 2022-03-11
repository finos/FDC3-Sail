import { RuntimeListener } from './listeners/listener';
import { FDC3Listener } from './types/FDC3Listener';
import { Context } from '@finos/fdc3';
import { FDC3App, ResolverDetail } from './types/FDC3Data';
import { channels } from './system-channels';
import { View } from './view';
import { Workspace } from './workspace';
import { ViewConfig } from './types/ViewConfig';
import { WorkspaceConfig } from './types/WorkspaceConfig';
import { net } from 'electron';
import utils from './utils';
import { Pending } from './types/Pending';
import { IntentResolver } from './IntentResolver';

// map of all running contexts keyed by channel
const contexts: Map<string, Array<Context>> = new Map([['default', []]]);

//collection of queued intents to apply to tabs when they connect
const pending_intents: Array<Pending> = [];
//collection of queud contexts to apply to tabs when they connect
const pending_contexts: Array<Pending> = [];

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
const resolvers: Map<string, IntentResolver> = new Map();

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

  setPendingContext(viewId: string, source: string, context: Context) {
    pending_contexts.push(new Pending(viewId, source, { context: context }));
  }

  setPendingIntent(
    viewId: string,
    source: string,
    intent: string,
    context?: Context,
  ) {
    pending_intents.push(
      new Pending(viewId, source, { intent: intent, context: context }),
    );
  }

  getPendingIntents(): Array<Pending> {
    return pending_intents;
  }

  getPendingContexts(): Array<Pending> {
    return pending_contexts;
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
    options: Array<FDC3App>,
  ): IntentResolver {
    return new IntentResolver(view, detail, options);
  }

  getResolvers(): Map<string, IntentResolver> {
    return resolvers;
  }
}
