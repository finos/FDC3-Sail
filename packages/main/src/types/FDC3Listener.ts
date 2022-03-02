/**
 * represents an event listener used by internals of FDC3
 * can be a context listener or an intent listener
 */
export interface FDC3Listener {
    //the id of the owner of the listener
    viewId : string;
    //the id of the app that has set the listener (in the case of direct messaging)
    source? : string;
    contextType? : string;
    intent? : string;
    channel? : string;
    isChannel?:boolean;
    listenerId:string;
}