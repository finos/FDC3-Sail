import { Listener as IListener } from '../types/Listener';
import { Context, AppIntent, AppMetadata, IntentMetadata } from '@finos/fdc3';
import { FDC3Message } from '../types/FDC3Message';
import { Channel, DirectoryApp, FDC3App } from '../types/FDC3Data';
import utils from '../utils';
//import {createView, views} from '../managers/viewManager';
import { View } from '../view';
import { setPendingContext } from '../managers/contextManager';
import { getRuntime } from '../index';
import { Runtime } from '../runtime';
import { ipcMain } from 'electron';
import fetch from 'electron-fetch';
import { TOPICS } from '../constants';
import { FDC3Listener } from '../types/FDC3Listener';

/**
 * represents an event listener
 */
interface Listener {
  appId: string;
  contextType?: string;
  isChannel?: boolean;
  listenerId: string;
}

//wait 2 minutes for pending intents to connect
const pendingTimeout: number = 2 * 60 * 1000;

//map of pending contexts for specific app instances
const pending_instance_context: Map<string, Map<string, any>> = new Map();

// map of all running contexts keyed by channel
//const contexts : Map<string,Array<Context>> = new Map([["default",[]]]);

//map of listeners for each context channel
//const contextListeners : Map<string,Map<string,Listener>> = new Map([["default",new Map()]]);
//make a separate map of instance listeners,
//this would just be for handling point-to-point context transfer
const instanceListeners: Map<string, Map<string, Listener>> = new Map();

//collection of app channel ids
const app_channels: Array<Channel> = [];

//generate / get full channel object from an id - returns null if channel id is not a system channel or a registered app channel
const getChannelMeta = (id: string): Channel | null => {
  let channel: Channel | null = null;
  //is it a system channel?
  const sChannels: Array<Channel> = utils.getSystemChannels();
  const sc = sChannels.find((c) => {
    return c.id === id;
  });

  if (sc) {
    channel = { id: id, type: 'system', displayMetadata: sc.displayMetadata };
  }
  //is it already an app channel?
  if (!channel) {
    const ac = app_channels.find((c) => {
      return c.id === id;
    });
    if (ac) {
      channel = { id: id, type: 'app' };
    }
  }
  return channel;
};

const _listeners: Array<IListener> = [];

_listeners.push({
  name: TOPICS.FDC3_DROP_CONTEXT_LISTENER,
  handler: (runtime: Runtime, msg): Promise<void> => {
    //remove the listener from the view when it is unsubscribed
    return new Promise((resolve, reject) => {
      try {
        const id = msg.data.id;
        const view: View | null | undefined = msg.source
          ? runtime.getView(msg.source)
          : null;
        if (view) {
          view.listeners = view.listeners.filter((l: FDC3Listener) => {
            return l.listenerId !== id;
          });
        }

        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_GET_CURRENT_CONTEXT,
  handler: (runtime, msg) => {
    return new Promise((resolve, reject) => {
      try {
        const channel = msg.data.channel;
        const type = msg.data.contextType;
        const contexts = getRuntime().getContexts();
        let ctx: Context | null = null;
        if (channel) {
          const channelContext = contexts.get(channel);
          if (type && channelContext) {
            ctx =
              channelContext.find((c) => {
                return c.type === type;
              }) || null;
          } else if (channelContext) {
            ctx = channelContext[0] ? channelContext[0] : ctx;
          }
        }
        resolve(ctx);
      } catch (err) {
        reject(err);
      }
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_BROADCAST,
  handler: (runtime: Runtime, msg) => {
    return new Promise((resolve, reject) => {
      const contexts = runtime.getContexts();
      const source = msg.source ? runtime.getView(msg.source) : null;
      try {
        //if there is an instanceId provided on the message - this is the instance target of the broadcast
        //meaning this is a point-to-point com between two instances
        //if the target listener is registered for the source instance, then dispatch the context
        //else, add to the pending queue for instances
        const targetId: string = msg.data.instanceId;
        if (targetId) {
          console.log(
            `broadcast message = '${JSON.stringify(
              msg,
            )}' target = '${targetId}' source = '${msg.source}'`,
          );
          let setPending = false;
          const target = runtime.getView(targetId);
          const viewListeners: Array<ViewListener> = [];
          if (target) {
            target.listeners.forEach((l: FDC3Listener) => {
              if (!l.intent) {
                if (
                  !l.contextType ||
                  (l.contextType && l.contextType === msg.data.context.type)
                ) {
                  viewListeners.push({
                    view: target,
                    listenerId: l.listenerId,
                  });
                }
              }
            });
            if (viewListeners.length > 0) {
              viewListeners.forEach((viewL: ViewListener) => {
                const data = {
                  listenerId: viewL.listenerId,
                  eventId: msg.data.eventId,
                  ts: msg.data.ts,
                  context: msg.data.context,
                };
                viewL.view.content.webContents.send(TOPICS.FDC3_CONTEXT, {
                  topic: 'context',
                  listenerId: viewL.listenerId,
                  data: data,
                  source: msg.source,
                });
              });
            } else {
              setPending = true;
            }
          }

          if (setPending && target) {
            target.pendingContexts.unshift(msg.data.context);
          }
          //if we have a target, we aren't going to go to other channnels - so resolve
          resolve(null);
        }

        //use channel on message first - if one is specified
        const channel =
          msg.data.channel || (source && source.channel) || 'default';

        if (channel !== 'default') {
          //is the app on a channel?
          // update the channel state
          const channelContext = contexts.get(channel);
          if (channelContext) {
            channelContext.unshift(msg.data.context);
          }

          //if there is a channel, filter on channel
          //to filter on channel, check the listener channel andthe view channel (its channel membe)
          const viewListeners: Array<ViewListener> = [];
          runtime.getViews().forEach((v) => {
            v.listeners.forEach((l) => {
              const matchChannel = l.channel
                ? l.channel
                : v.channel
                ? v.channel
                : 'default';
              if (matchChannel === channel) {
                if (l.contextType) {
                  if (l.contextType === msg.data.context.type) {
                    viewListeners.push({ view: v, listenerId: l.listenerId });
                  }
                } else {
                  viewListeners.push({ view: v, listenerId: l.listenerId });
                }
              }
            });
          });
          viewListeners.forEach((viewL) => {
            const data = {
              listenerId: viewL.listenerId,
              eventId: msg.data.eventId,
              ts: msg.data.ts,
              context: msg.data.context,
            };
            viewL.view.content.webContents.send(TOPICS.FDC3_CONTEXT, {
              topic: 'context',
              listenerId: viewL.listenerId,
              data: data,
              source: msg.source,
            });
          });
        }
        resolve(null);
      } catch (err) {
        reject(err);
      }
    });
  },
});

interface ViewListener {
  view: View;
  listenerId: string;
}

_listeners.push({
  name: TOPICS.FDC3_OPEN,
  handler: (runtime, msg) => {
    return new Promise((resolve, reject) => {
      console.log('fdc3Message recieved', msg);

      runtime.fetchFromDirectory(`/apps/${msg.data.name}`).then(
        (result: DirectoryApp) => {
          // const source = utils.id(port);
          if (result) {
            if (result && result.start_url) {
              //get target workspace
              const sourceView = runtime.getView(msg.source);
              const work =
                runtime.getWorkspace(msg.source) ||
                (sourceView && sourceView.parent);
              const newView =
                work &&
                work.createView(result.start_url, { directoryData: result });

              //set provided context
              if (newView && msg.context) {
                setPendingContext(newView.id, msg.source, msg.context);
              }
              //resolve with the window identfier
              resolve(null);
              //reject?
            }
          }
        },
        (err) => {
          reject(err);
        },
      );
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_GET_CURRENT_CONTEXT,
  handler: (runtime, msg) => {
    return new Promise((resolve, reject) => {
      try {
        const channel = msg.data.channel;
        const type = msg.data.contextType;
        let ctx: Context | null = null;
        if (channel) {
          const contexts = runtime.getContexts();
          const channelContext = contexts.get(channel);
          if (type) {
            if (channelContext) {
              ctx =
                channelContext.find((c) => {
                  return c.type === type;
                }) || null;
            }
          } else {
            ctx = channelContext && channelContext[0] ? channelContext[0] : ctx;
          }
        }
        resolve(ctx);
      } catch (err) {
        reject(err);
      }
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_GET_OR_CREATE_CHANNEL,
  handler: (runtime, msg) => {
    return new Promise((resolve, reject) => {
      const id = msg.data.channelId;
      //reject with error is reserved 'default' term
      if (id === 'default') {
        reject(utils.ChannelError.CreationFailed);
      } else {
        let channel: Channel | null = getChannelMeta(id);

        //if not found... create as an app channel
        if (!channel) {
          channel = { id: id, type: 'app' };
          //add an entry for the context listeners
          //contextListeners.set(id, new Map());
          runtime.getContexts().set(id, []);
          app_channels.push(channel);
        }
        resolve(channel);
      }
    });
  },
});

/**
 * Each View object has its own collection of listeners
 */
_listeners.push({
  name: TOPICS.FDC3_ADD_CONTEXT_LISTENER,
  handler: (runtime: Runtime, msg) => {
    return new Promise((resolve, reject) => {
      try {
        const source = msg.source; //this is the app instance calling addContextListener

        //if there is an instanceId specified, this call is to listen to context from a specific app instance
        const view = runtime.getView(msg.source);
        const instanceId = msg.data.instanceId;
        if (instanceId && view) {
          console.log(
            'addContextLister ',
            instanceId,
            instanceListeners,
            pending_instance_context,
          );
          const target: View | undefined = runtime.getView(instanceId);
          if (target) {
            //add a listener for the specific target (instanceId)
            target.listeners.push({
              viewId: view.id,
              source: instanceId,
              listenerId: msg.data.id,
              contextType: msg.data.contextType,
            });

            if (target.pendingContexts && target.pendingContexts.length > 0) {
              target.pendingContexts.forEach((pending, i) => {
                //does the source of the pending context match the target?
                if (pending && pending.source && pending.source === view.id) {
                  //is there a match on contextType (if specified...)
                  if (
                    pending.context &&
                    pending.context.type &&
                    pending.context.type === msg.data.type
                  ) {
                    view.content.webContents.postMessage(TOPICS.FDC3_CONTEXT, {
                      topic: 'context',
                      data: pending.context,
                      source: source,
                    });
                    target.pendingContexts.splice(i, 1);
                  }
                }
              });
            }
          }
          resolve(true);
        }

        //use channel from the event message first, or use the channel of the sending app, or use default
        const channel: string =
          msg.data !== null && msg.data.channel ? msg.data.channel : 'default'; //: (c && c.channel) ? c.channel

        if (view) {
          view.listeners.push({
            listenerId: msg.data.id,
            viewId: view.id,
            contextType: msg.data.contextType,
            channel: channel,
            isChannel: channel !== 'default',
          });

          /*
              are there any pending contexts for the listener just added? 
              */
          if (view.pendingContexts && view.pendingContexts.length > 0) {
            view.pendingContexts.forEach((pending, i) => {
              //is there a match on contextType (if specified...)
              if (
                pending.context &&
                pending.context.type &&
                pending.context.type === msg.data.type
              ) {
                view.content.webContents.postMessage(TOPICS.FDC3_CONTEXT, {
                  topic: 'context',
                  data: pending.context,
                  source: source,
                });
                view.pendingContexts.splice(i, 1);
              }
            });
          }
        }

        resolve(true);
      } catch (err) {
        reject(err);
      }
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_GET_SYSTEM_CHANNELS,
  handler: () => {
    return new Promise((resolve) => {
      resolve(utils.getSystemChannels());
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_LEAVE_CURRENT_CHANNEL,
  handler: (runtime, msg) => {
    return new Promise((resolve, reject) => {
      //'default' means we have left all channels
      const view = runtime.getView(msg.source);
      if (view) {
        joinViewToChannel('default', view);
        resolve(null);
      } else {
        reject('View not found');
      }
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_ADD_INTENT_LISTENER,
  handler: (runtime, msg): Promise<void> => {
    return new Promise((resolve, reject) => {
      const name = msg.data.intent;
      const listenerId = msg.data.id;
      try {
        getRuntime().setIntentListener(name, listenerId, msg.source);

        //check for pending intents
        let pending_intents = runtime.getPendingIntents();
        if (pending_intents.length > 0) {
          //first cleanup anything old
          const n = Date.now();

          pending_intents = pending_intents.filter((i) => {
            return n - i.ts < pendingTimeout;
          });
          //next, match on tab and intent
          pending_intents.forEach((pIntent, index) => {
            if (pIntent.viewId === msg.source && pIntent.intent === name) {
              console.log('applying pending intent', pIntent);
              //refactor with other instances of this logic
              const view = runtime.getView(pIntent.viewId);
              if (view && view.content) {
                view.content.webContents.send(TOPICS.FDC3_INTENT, {
                  topic: 'intent',
                  data: { intent: pIntent.intent, context: pIntent.context },
                  source: pIntent.source,
                });
              }
              //bringing the tab to front conditional on the type of intent
              /* if (! utils.isDataIntent(pIntent.intent)){
                              utils.bringToFront(port.sender.tab);
                          }*/
              //remove the applied intent
              pending_intents.splice(index, 1);
            }
          });
        }
        resolve();
      } catch (err) {
        reject(err);
      }
    });
  },
});
export const joinViewToChannel = (
  channel: string,
  view: View,
  restoreOnly?: boolean,
): Promise<void> => {
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
        if (channelContext) {
          const ctx = channelContext.length > 0 ? channelContext[0] : null;
          let contextSent = false;
          if (ctx && !restoreOnly) {
            // send to individual listenerIds
            view.listeners.forEach((l) => {
              //if this is not an intent listener, and not set for a specific channel, and not set for a non-matching context type  - send the context to the listener
              if (!l.intent) {
                if (
                  (!l.channel || (l.channel && l.channel === channel)) &&
                  (!l.contextType ||
                    (l.contextType && l.contextType === ctx.type))
                ) {
                  view.content.webContents.send(TOPICS.FDC3_CONTEXT, {
                    topic: 'context',
                    data: { context: ctx, listenerId: l.listenerId },
                    source: view.id,
                  });
                  contextSent = true;
                }
              }
            });
            if (!contextSent) {
              //note: the source for this context is the view itself - since this was the result of being joined to the channel (not context being broadcast from another view)
              setPendingContext(
                view.id,
                view.id,
                channelContext && channelContext[0],
              );
            }
          }
        }
      }

      resolve();
    } catch (err) {
      reject(err);
    }
  });
};

_listeners.push({
  name: TOPICS.FDC3_JOIN_CHANNEL,
  handler: (runtime, msg) => {
    return new Promise((resolve, reject) => {
      try {
        const view = runtime.getView(msg.source);
        if (view) {
          joinViewToChannel(msg.data.channel, view, msg.data.restoreOnly).then(
            () => {
              resolve(true);
            },
            () => {
              resolve(false);
            },
          );
        }
      } catch (err) {
        reject(err);
      }
    });
  },
});

_listeners.push({
  name: TOPICS.JOIN_WORKSPACE_TO_CHANNEL,
  handler: (runtime, msg) => {
    console.log('join workspace to channel');
    return new Promise((resolve, reject) => {
      //get collection of views for the window
      try {
        const workspace = runtime.getWorkspace(msg.source);
        if (workspace) {
          workspace.setChannel(msg.data.channel);
          resolve(true);
        } else {
          resolve(false);
        }
      } catch (err) {
        reject(err);
      }
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_FIND_INTENT,
  handler: (runtime, msg): Promise<any> => {
    return new Promise((resolve, reject) => {
      const intent = msg.data.intent;
      let context = msg.data.context;
      if (intent) {
        let url = `/apps/search?intent=${intent}`;
        if (context) {
          //only use type
          if (typeof context === 'object') {
            context = context.type;
          }
          url += `&context=${context}`;
        }

        runtime.fetchFromDirectory(url).then(
          (_r) => {
            const j: Array<DirectoryApp> = _r as Array<DirectoryApp>;
            const r: any = { intent: { name: '', displayName: '' }, apps: [] };

            // r.apps = j;
            //find intent display name from app directory data
            const intnt = j[0].intents.filter((i) => {
              return i.name === intent;
            });
            if (intnt.length > 0) {
              r.intent.name = intnt[0].name;
              r.intent.displayName = intnt[0].display_name;
            }
            j.forEach((dirApp) => {
              r.apps.push({
                name: dirApp.name,
                title: dirApp.title,
                description: dirApp.description,
                icons: dirApp.icons.map((icon) => {
                  return icon.icon;
                }),
              });
            });
            resolve(r as AppIntent);
          },
          () => {
            //no results found for the app-directory, there may still be intents from live apps
            resolve({ result: true, apps: [] });
          },
        );
      } else {
        reject('no intent');
      }
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_FIND_INTENTS_BY_CONTEXT,
  handler: (runtime, msg): Promise<Array<AppIntent>> => {
    return new Promise((resolve, reject) => {
      let context = msg.data.context;
      if (context.type) {
        context = context.type;
      }
      if (context) {
        console.log('findIntentsByContext', context);
        const url = `/apps/search?context=${context}`;
        runtime.fetchFromDirectory(url).then(
          (_r) => {
            const d: Array<DirectoryApp> = _r as Array<DirectoryApp>;
            const r: Array<AppIntent> = [];
            if (d) {
              const found: Map<string, Array<AppMetadata>> = new Map();
              const intents: Array<IntentMetadata> = [];
              d.forEach((item) => {
                const appMeta: AppMetadata = {
                  name: item.name,
                  title: item.title,
                  description: item.description,
                  icons: item.icons.map((icon) => {
                    return icon.icon;
                  }),
                };

                item.intents.forEach((intent) => {
                  if (!found.has(intent.name)) {
                    intents.push({
                      name: intent.name,
                      displayName: intent.display_name,
                    });
                    found.set(intent.name, [appMeta]);
                  } else {
                    const apps = found.get(intent.name);
                    if (apps) {
                      apps.push(appMeta);
                    }
                  }
                });
              });

              intents.forEach((intent) => {
                const apps = found.get(intent.name);
                const entry: AppIntent = { intent: intent, apps: apps || [] };
                r.push(entry);
              });
            }
            resolve(r);
          },
          (err) => {
            reject(err);
          },
        );
      } else {
        reject('no context provided');
      }
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_GET_CURRENT_CHANNEL,
  handler: (runtime, msg) => {
    return new Promise((resolve, reject) => {
      try {
        const c = runtime.getView(msg.source);
        //get the  channel
        const chan = c && c.channel ? getChannelMeta(c.channel) : null;
        resolve(chan);
      } catch (err) {
        reject(err);
      }
    });
  },
});

const resolveIntent = (msg: FDC3Message): Promise<any> => {
  return new Promise((resolve, reject) => {
    //find the app to route to
    try {
      const sType = msg.selected ? msg.selected.type : undefined;
      const sView =
        msg.selected && msg.selected.details && msg.selected.details.instanceId
          ? getRuntime().getView(msg.selected.details.instanceId)
          : null;
      const source = msg.source;
      if (msg.intent) {
        if (sType === 'window') {
          const listeners = getRuntime().getIntentListeners(msg.intent);
          //let keys = Object.keys(listeners);
          let appId: string | null = null;
          const id = (sView && sView.id) || null;
          listeners.forEach((listener) => {
            if (listener.source === id) {
              appId = listener.source;
            }
          });

          if (appId) {
            console.log('send intent from source', source);
            const app = getRuntime().getView(appId);
            if (app && app.content) {
              app.content.webContents.send(TOPICS.FDC3_INTENT, {
                topic: 'intent',
                data: { intent: msg.intent, context: msg.context },
                source: source,
              });
              //bringing the tab to front conditional on the type of intent
              /*if (! utils.isDataIntent(msg.intent)){
                          utils.bringToFront(appId); 
                      }*/
              const id = (sView && sView.id) || null;
              resolve({ source: id, version: '1.0', tab: id });
            }
          }
        } else if (sType === 'directory') {
          const directoryData =
            msg.selected &&
            msg.selected.details &&
            msg.selected.details.directoryData;
          let start_url = directoryData && directoryData.start_url;
          const appName = directoryData && directoryData.name;
          let pending = true;
          //are there actions defined?
          // console.log("hasActions",msg.selected.details.directoryData);

          if (directoryData && directoryData.hasActions) {
            utils.getDirectoryUrl().then(
              (directoryUrl) => {
                const body = { intent: msg.intent, context: msg.context };
                fetch(`${directoryUrl}/apps/${appName}/action`, {
                  headers: { 'Content-Type': 'application/json' },
                  method: 'POST',
                  body: JSON.stringify(body),
                }).then(async (templateR) => {
                  const action_url = await templateR.text();
                  //if we get a valid action url back, set that as the start and don't post pending data
                  if (action_url) {
                    start_url = action_url;
                    pending = false;
                  }
                  if (start_url && directoryData) {
                    const view = getRuntime()
                      .createWorkspace()
                      .createView(start_url, {
                        directoryData: directoryData,
                      });
                    if (pending && msg.intent) {
                      getRuntime().setPendingIntent(
                        view.id,
                        source,
                        msg.intent,
                        msg.context || undefined,
                      );
                    }

                    resolve({
                      result: true,
                      tab: view.id,
                      source: view.id,
                      version: '1.0',
                    });
                  } else {
                    resolve({ result: false });
                  }
                });
              },
              (err) => {
                reject(err);
              },
            );
          }
        }
        //keep array of pending, id by url,  store intent & context, timestamp
        //when a new window connects, throw out anything more than 2 minutes old, then match on url
      }
    } catch (err) {
      reject(err);
    }
  });
};

_listeners.push({
  name: TOPICS.FDC3_GET_APP_INSTANCE,
  handler: (runtime, msg) => {
    return new Promise((resolve, reject) => {
      const instance = runtime.getView(msg.data.instanceId);
      if (instance) {
        resolve({ instanceId: instance.id, status: 'ready' });
      } else {
        reject();
      }
    });
  },
});

_listeners.push({
  name: TOPICS.FDC3_RAISE_INTENT,
  handler: (runtime, msg) => {
    return new Promise((resolve, reject) => {
      const r: Array<FDC3App> = [];

      //handle the resolver UI closing
      /*  port.onMessage.addListener(async (msg : FDC3Message) => {
                if (msg.topic === "resolver-close"){
                    resolve(null);
                }
            });*/

      //decorate the message with source of the intent
      /*  msg.source = utils.id(port);*/

      //add dynamic listeners from connected tabs
      const intentListeners = runtime.getIntentListeners(
        msg.data.intent,
        msg.data.target,
      );
      console.log('intentListeners', intentListeners);
      if (intentListeners) {
        // let keys = Object.keys(intentListeners);
        intentListeners.forEach((listener) => {
          ///ignore listeners from the view that raised the intent
          if (listener.viewId !== msg.source) {
            //look up the details of the window and directory metadata in the "connected" store
            const view = runtime.getView(listener.viewId);
            //de-dupe
            if (
              view &&
              !r.find((item) => {
                return item.details.instanceId === view.id;
              })
            ) {
              r.push({
                type: 'window',
                details: {
                  instanceId: view.id,
                  directoryData: view.directoryData,
                },
              });
            }
          }
        });
      }
      //pull intent handlers from the directory
      let ctx = '';
      if (msg.data.context) {
        ctx = msg.data.context.type;
      }
      utils.getDirectoryUrl().then(async (directoryUrl) => {
        const _r = await fetch(
          `${directoryUrl}/apps/search?intent=${
            msg.data.intent
          }&context=${ctx}&name=${msg.data.target ? msg.data.target : ''}`,
        );
        if (_r) {
          let data = null;
          try {
            data = await _r.json();
          } catch (err) {
            console.log('error parsing json', err);
          }

          if (data) {
            data.forEach((entry: DirectoryApp) => {
              r.push({ type: 'directory', details: { directoryData: entry } });
            });
          }
        }

        if (r.length > 0) {
          if (r.length === 1) {
            //if there is only one result, use that
            //if it is an existing view, post a message directly to it
            //if it is a directory entry resolve the destination for the intent and launch it
            //dedupe window and directory items
            if (
              r[0].type === 'window' &&
              r[0].details &&
              r[0].details.instanceId
            ) {
              const view = runtime.getView(r[0].details.instanceId);
              if (view) {
                view.content.webContents.send(TOPICS.FDC3_INTENT, {
                  topic: 'intent',
                  data: msg.data,
                  source: msg.source,
                });
                //bringing the tab to front conditional on the type of intent
                if (!utils.isDataIntent(msg.data.intent)) {
                  /* utils.bringToFront(r[0].details.port); */
                }

                resolve({ result: true, source: view.id, version: '1.0' });
              }
            } else if (
              r[0].type === 'directory' &&
              r[0].details.directoryData
            ) {
              let start_url = r[0].details.directoryData.start_url;
              let pending = true;
              if (r[0].details.directoryData.hasActions) {
                const directoryUrl = await utils.getDirectoryUrl();
                const body = {
                  intent: msg.data.intent,
                  context: msg.data.context,
                };
                const templateR = await fetch(
                  `${directoryUrl}/apps/${r[0].details.directoryData.name}/action`,
                  {
                    headers: { 'Content-Type': 'application/json' },
                    method: 'POST',
                    body: JSON.stringify(body),
                  },
                );
                const action_url = await templateR.text();
                //if we get a valid action url back, set that as the start and don't post pending data
                if (action_url) {
                  start_url = action_url;
                  pending = false;
                }
              }

              //let win = window.open(start_url,"_blank");
              const view = getRuntime()
                .createWorkspace()
                .createView(start_url, {
                  directoryData: r[0].details.directoryData,
                });
              //view.directoryData = r[0].details.directoryData;
              //set pending intent for the view..
              if (pending) {
                getRuntime().setPendingIntent(
                  view.id,
                  msg.source,
                  msg.data.intent,
                  msg.data.context,
                );
              }

              resolve({
                result: true,
                source: msg.source,
                version: '1.2',
                tab: view.id,
              });

              //send the context - if the default start_url was used...
              //get the window/tab...
              // resolve({result:true});
            }
          } else {
            //show resolver UI
            // Send a message to the active tab
            //sort results alphabetically, with directory entries first (before window entries)
            const getTitle = (app: FDC3App) => {
              const view = app.details.instanceId
                ? runtime.getViews().get(app.details.instanceId)
                : null;
              const directory = app.details.directoryData
                ? app.details.directoryData
                : null;
              return directory
                ? directory.title
                : view &&
                  view.content.webContents &&
                  view.content.webContents.hostWebContents
                ? view.content.webContents.hostWebContents.getTitle()
                : 'Untitled';
            };
            r.sort((a, b) => {
              //let aTitle = a.details.directoryData ? a.details.directoryData.title : a.details.view.content.webContents.getURL();
              // let bTitle = b.details.directoryData ? b.details.directoryData.title : b.details.view.content.webContents.getURL();
              a.details.title = getTitle(a);
              b.details.title = getTitle(b);

              if (a.details.title < b.details.title) {
                return -1;
              }
              if (a.details.title > b.details.title) {
                return 1;
              } else {
                return 0;
              }
            });

            const eventId = `resolveIntent-${Date.now()}`;

            //set a handler for resolving the intent (when end user selects a destination)
            ipcMain.on(eventId, async (event, args) => {
              const r = await resolveIntent(args);
              resolve(r);
            });

            //launch window with resolver UI
            console.log('resolve intent - options', r);
            const sourceView = getRuntime().getView(msg.source);
            if (sourceView) {
              getRuntime().openResolver(
                { intent: msg.data.intent, context: msg.data.context },
                sourceView,
                r,
              );
            }
            /* chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
                        var activeTab = tabs[0];
                       
                        chrome.tabs.sendMessage(activeTab.id, {
                            "message": "intent_resolver", 
                            "eventId": eventId,
                            "data":r, 
                            "intent":msg.data.intent,
                            "context":msg.data.context});
                        
                    });*/
          }
        } else {
          //show message indicating no handler for the intent...
          reject('no apps found for intent');
        }
      });
    });
  },
});

export const listeners = _listeners;
