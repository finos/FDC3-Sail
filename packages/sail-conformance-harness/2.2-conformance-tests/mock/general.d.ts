import { Context } from '@finos/fdc3';
export interface ContextSender extends Context {
    context?: Context;
}
