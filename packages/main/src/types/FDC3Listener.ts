/**
 * represents an event listener used by internals of FDC3
 * can be a context listener or an intent listener
 */
export interface FDC3Listener {
  //the id of the owner of the listener
  viewId: string | undefined;
  //the id of the app that has set the listener (in the case of direct messaging)
  source?: string | undefined;
  contextType?: string | undefined;
  intent?: string | undefined;
  channel?: string | undefined;
  isChannel?: boolean;
  listenerId: string;
}
