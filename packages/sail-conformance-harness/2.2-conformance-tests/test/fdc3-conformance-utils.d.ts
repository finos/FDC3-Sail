import { Channel } from '@finos/fdc3';
import { AppControlContextListener } from '../context-types';
export declare function closeMockAppWindow(testId: string, count?: number): Promise<void>;
export declare const waitForContext: (contextType: string, testId: string, channel: Channel, count?: number) => Promise<AppControlContextListener>;
