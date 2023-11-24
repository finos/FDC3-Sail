import { Context } from './FDC3Message';
/**
 * reperesents a pending event to be passed to an app once it is loaded
 */
export class Pending {
  /**
   * timestamp
   */
  ts: number;

  /**
   * identifier for pending view
   */
  viewId: string;

  /**
   * identifier for the instance the originated intent or context
   */
  source: string;

  /**
   * context object to apply
   */
  context?: Context | null;

  /**
   * name of intent to apply
   */
  intent?: string | null;

  /**
   * id of channel to join
   */
  channel?: string | null;

  /**
   * nonce for intent result
   */
  resultId?: string | null;

  /**
   *
   * @param viewId
   * @param init
   */
  constructor(viewId: string, source: string, init: PendingInitObject) {
    this.ts = Date.now();
    this.viewId = viewId;
    this.source = source;
    this.context = init.context ? init.context : null;
    this.intent = init.intent ? init.intent : null;
    this.channel = init.channel ? init.channel : null;
    this.resultId = init.resultId ? init.resultId : null;
  }
}

export interface PendingInitObject {
  context?: Context;
  intent?: string;
  channel?: string;
  resultId?: string;
}
