import { Listener as Listener1_2, ContextHandler as ContextHandler1_2 } from 'fdc3-1.2'
import { SendMessage } from '../message';
import { FDC3_2_0_TOPICS } from '/@main/handlers/fdc3/2.0/topics';

/* Both 1.2 and 2.0 are the same signature */
export type SailListener = Listener1_2;
export type SailContextHandler = ContextHandler1_2

//map of context listeners by id
const contextListeners: Map<string, ListenerItem> = new Map();

//map of intents holding map of listeners for each intent
const intentListeners: Map<string, Map<string, ListenerItem>> = new Map();

export function getContextListeners() :  Map<string, ListenerItem> {
    return contextListeners;
}

export function getIntentListeners() :  Map<string, Map<string, ListenerItem>> {
    return intentListeners;
}

/**
 *  the Listener class
 */
export class FDC3Listener implements SailListener {
    private id: string;

    type: string;

    intent: string | null = null;

    constructor(type: string, listenerId: string, sendMessage: SendMessage, intent?: string) {
        this.id = listenerId;
        this.type = type;
        if (type === 'intent' && intent) {
            this.intent = intent;
        }

        this.unsubscribe = () => {
            if (this.type === 'context') {
                contextListeners.delete(this.id);

                sendMessage(FDC3_2_0_TOPICS.DROP_CONTEXT_LISTENER, {
                    listenerId: this.id,
                });
            } else if (this.type === 'intent' && this.intent) {
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
    handler?: SailContextHandler;
    contextType?: string;
}

export const createListenerItem = (
    id: string,
    handler: SailContextHandler,
    contextType?: string,
): ListenerItem => {
    const listener: ListenerItem = {};
    listener.id = id;
    listener.handler = handler;
    listener.contextType = contextType;

    return listener;
};