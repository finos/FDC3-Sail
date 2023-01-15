import { getRuntime } from '../index';
import { TargetIdentifier } from './FDC3Message';
import { Context } from '@finos/fdc3';

/**
 * Base Class for IntentTransfer and ContextTransfer
 * tracks the lifecycle of message transfer from source app to a target.
 * Used for intent lifecycle and for transfer of context in fdc3.open
 * the TransferInstance has the following lifecycle:
 * - raised  (created)
 * - pending  (a target app for the transfer has been determined / selected)
 * - resolved (an ack has been received from the target app)
 *
 * for intents - after status has gone to 'resolved' the intent can return a result
 */

export type TransferStatus = 'raised' | 'pending' | 'resolved';

export class TransferInstance {
  id: string;

  source: string;

  target?: TargetIdentifier | undefined;

  status: TransferStatus = 'raised';

  constructor(id: string, source: string) {
    this.id = id;

    this.source = source;
  }

  setTarget(target: TargetIdentifier) {
    this.target = target;
    this.status = 'pending';
  }

  resolve() {
    this.status = 'resolved';
    //resolve the transfer
    //this goes to the source view - which then sends the needed FDC3 event to its content

    const runtime = getRuntime();
    const sourceView = runtime.getView(this.source);
    if (sourceView && this.target) {
      sourceView.resolveTransfer(this.id, this.target);
    }
  }
}

/**
 * the ContextInstance encapsulates the lifecycle of a pending Context (e.g. for fdc3.open)

 */

export class ContextTransfer extends TransferInstance {
  context: Context;

  constructor(id: string, source: string, context: Context) {
    super(id, source);
    this.id = id;

    this.source = source;

    this.context = context;
  }
}

/**
 * the IntentInstance encapsulates the lifecycle of an intent from being raised to providing a result

 * after status has gone to 'resolved' the intent can return a result
 */

export class IntentTransfer extends TransferInstance {
  intent: string;

  context?: Context | undefined;

  resultId?: string | undefined;

  constructor(id: string, source: string, intent: string, context?: Context) {
    super(id, source);
    this.id = id;

    this.source = source;

    this.intent = intent;

    this.context = context;
  }
}
