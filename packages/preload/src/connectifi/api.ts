import { ipcRenderer } from 'electron';
import {
  AppIntent,
  Context,
  DesktopAgent,
  Listener,
  ContextHandler,
  Channel,
  PrivateChannel,
  ImplementationMetadata,
  IntentResolution,
  AppIdentifier,
  AppMetadata,
} from '@finos/fdc3';
import { SAIL_TOPICS } from '/@main/handlers/runtime/topics';

/**
 * This file is injected into each Chrome tab by the Content script to make the FDC3 API available as a global
 */

export const createAPI = (agent: DesktopAgent): DesktopAgent => {
  function openFunc(
    name: string,
    context?: Context | undefined,
  ): Promise<AppIdentifier>;
  function openFunc(
    app: AppIdentifier,
    context?: Context | undefined,
  ): Promise<AppIdentifier>;
  async function openFunc(
    appArg: unknown,
    contextArg?: Context | undefined,
  ): Promise<AppIdentifier> {
    return await agent.open(appArg as AppIdentifier, contextArg);
  }

  function raiseIntent(
    intent: string,
    context: Context,
    app?: AppIdentifier | undefined,
  ): Promise<IntentResolution>;
  function raiseIntent(
    intent: string,
    context: Context,
    name?: string,
  ): Promise<IntentResolution>;
  async function raiseIntent(
    intent: string,
    context: Context,
    appIdentity?: unknown,
  ): Promise<IntentResolution> {
    return await agent.raiseIntent(
      intent,
      context,
      appIdentity as AppIdentifier,
    );
  }

  function raiseIntentForContext(
    context: Context,
    app?: AppIdentifier | undefined,
  ): Promise<IntentResolution>;
  function raiseIntentForContext(
    context: Context,
    name?: string,
  ): Promise<IntentResolution>;
  async function raiseIntentForContext(
    context: Context,
    appIdentity?: unknown,
  ): Promise<IntentResolution> {
    const identity: AppIdentifier =
      typeof appIdentity === 'string'
        ? ({ appId: appIdentity } as AppIdentifier)
        : (appIdentity as AppIdentifier);

    return await agent.raiseIntentForContext(
      context,
      identity as AppIdentifier,
    );
  }

  const desktopAgent: DesktopAgent = {
    getInfo: async (): Promise<ImplementationMetadata> => {
      return await agent.getInfo();
    },

    findInstances: async (
      app: AppIdentifier,
    ): Promise<Array<AppIdentifier>> => {
      return await agent.findInstances(app);
    },

    getAppMetadata: async (app: AppIdentifier): Promise<AppMetadata> => {
      return await agent.getAppMetadata(app);
    },

    open: openFunc,

    broadcast: async (context: Context) => {
      //void
      return await agent.broadcast(context);
    },

    raiseIntent: raiseIntent,

    raiseIntentForContext: raiseIntentForContext,

    addContextListener: async (
      contextType: ContextHandler | string | null,
      handler?: ContextHandler,
    ): Promise<Listener> => {
      return await agent.addContextListener(
        contextType as string | null,
        handler as ContextHandler,
      );
    },

    addIntentListener: async (
      intent: string,
      listener: ContextHandler,
    ): Promise<Listener> => {
      return await agent.addIntentListener(intent, listener);
    },

    findIntent: async (
      intent: string,
      context: Context,
    ): Promise<AppIntent> => {
      return await agent.findIntent(intent, context);
    },

    findIntentsByContext: async (
      context: Context,
    ): Promise<Array<AppIntent>> => {
      return await agent.findIntentsByContext(context);
    },

    getSystemChannels: async (): Promise<Array<Channel>> => {
      return await agent.getUserChannels();
    },

    getUserChannels: async (): Promise<Array<Channel>> => {
      return await agent.getUserChannels();
    },

    createPrivateChannel: async (): Promise<PrivateChannel> => {
      return await agent.createPrivateChannel();
    },

    getOrCreateChannel: async (channelId: string) => {
      return await agent.getOrCreateChannel(channelId);
    },

    joinUserChannel: async (channel: string) => {
      return await agent.joinUserChannel(channel);
    },

    joinChannel: async (channel: string) => {
      return await agent.joinUserChannel(channel);
    },

    leaveCurrentChannel: async () => {
      return await agent.leaveCurrentChannel();
    },

    getCurrentChannel: async () => {
      return await agent.getCurrentChannel();
    },
  };

  //prevent timing issues from very first load of the preload
  ipcRenderer.send(SAIL_TOPICS.INITIATE, {});

  return desktopAgent;
};
