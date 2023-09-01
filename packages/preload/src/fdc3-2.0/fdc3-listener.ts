// import { SailContextHandler } from "../fdc3-1.2/fdc3-listener";

// //listener that takes standard ContextHandler type
// export interface ListenerItem {
//     id?: string;
//     handler?: SailContextHandler;
//     contextType?: string;
//   }
  
//   //listener for async intent handlers (2.0)
//   export interface IntentListenerItem {
//     id?: string;
//     handler?: IntentHandler;
//     contextType?: string;
//   }
  
//   //listener that takes handler with ContextType arg only
//   export interface ContextTypeListenerItem {
//     id?: string;
//     handler?: (contextType: string) => void;
//     contextType?: string;
//   }
  
//   //listenet with handler that has no args
//   export interface VoidListenerItem {
//     id?: string;
//     handler?: () => void;
//     contextType?: string;
//   }