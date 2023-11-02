import {
  Listener as Listener1_2,
} from 'fdc3-1.2';
import { SendMessage } from '../message';
import { FDC3_2_0_TOPICS } from '/@main/handlers/fdc3/2.0/topics';
import {
  FDC3_TOPICS_CONTEXT,
  FDC3_TOPICS_INTENT,
  ListenerType,
} from '/@main/handlers/fdc3/topics';

import { Context } from '/@main/types/FDC3Message';
import { IntentResult } from 'fdc3-2.0';
import { SailContextMetadata } from '/@main/types/FDC3Data';

/* Both 1.2 and 2.0 are the same signature */
export type SailListener = Listener1_2;

/* The 2.0 type is a superset of the 1.2 one.
 * This can take either IntentHandler or ContextHandler contents */
export type SailGenericHandler = (
  context: Context,
  metadata?: SailContextMetadata,
) => Promise<IntentResult> | void;

//map of context listeners by id
const contextListeners: Map<string, ListenerItem> = new Map();

//map of intents holding map of listeners for each intent
const intentListeners: Map<string, Map<string, ListenerItem>> = new Map();

export function getContextListeners(): Map<string, ListenerItem> {
  return contextListeners;
}

export function getIntentListeners(): Map<string, Map<string, ListenerItem>> {
  return intentListeners;
}

/**
 *  the Listener class
 */
export class FDC3Listener implements SailListener {
  private id: string;

  type: string;

  intent: string | null = null;

  constructor(
    type: ListenerType,
    listenerId: string,
    sendMessage: SendMessage,
    intent?: string,
  ) {
    this.id = listenerId;
    this.type = type;
    if (type === FDC3_TOPICS_INTENT && intent) {
      this.intent = intent;
    }

    this.unsubscribe = () => {
      if (this.type === FDC3_TOPICS_CONTEXT) {
        contextListeners.delete(this.id);

        sendMessage(FDC3_2_0_TOPICS.DROP_CONTEXT_LISTENER, {
          listenerId: this.id,
        });
      } else if (this.type === FDC3_TOPICS_INTENT && this.intent) {
        const listeners = intentListeners.get(this.intent);
        if (listeners) {
          listeners.delete(this.id);
        }

        sendMessage(FDC3_2_0_TOPICS.DROP_INTENT_LISTENER, {
          listenerId: this.id,
          intent: intent,
        });
      }
    };
  }

  unsubscribe: () => void;
}

export interface ListenerItem {
  id?: string;
  handler?: SailGenericHandler;
  contextType?: string;
  resultPromise: Promise<IntentResult>;
}

export const createListenerItem = (
  id: string,
  handler: SailGenericHandler,
  contextType?: string,
): ListenerItem => {
  const resultPromise = new Promise<IntentResult>((resolve, reject) => {});

  const listener: ListenerItem = {
    id,
    handler,
    contextType,
    resultPromise,
  };

  return listener;
};
