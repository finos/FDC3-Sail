import { Context } from '@finos/fdc3';
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
  context?: Context;

  /**
   * name of intent to apply
   */
  intent?: string;

  /**
   * id of channel to join
   */
  channel?: string;

  /**
   *
   * @param viewId
   * @param init
   */
  constructor(viewId: string, source: string, init: any) {
    this.ts = Date.now();
    this.viewId = viewId;
    this.source = source;
    this.context = init.context ? init.context : null;
    this.intent = init.intent ? init.intent : null;
    this.channel = init.channel ? init.channel : null;
  }
}
