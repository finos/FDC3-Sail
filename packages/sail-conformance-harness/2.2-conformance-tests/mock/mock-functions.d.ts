import { DesktopAgent } from '@finos/fdc3';
import { AppControlContext } from '../context-types';
export declare const closeWindowOnCompletion: (fdc3: DesktopAgent) => Promise<void>;
export declare const sendContextToTests: (fdc3: DesktopAgent, context: AppControlContext) => Promise<void>;
export declare const validateContext: (fdc3: DesktopAgent, receivedContextType: string, expectedContextType: string) => void;
