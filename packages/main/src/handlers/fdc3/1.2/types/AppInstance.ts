import { WebContents } from 'electron';

/**
 * represents an app instance when resolving intents
 * can either represent a directory item or a connected instance
 */
export interface AppInstance {
  details: AppDetails;
  type: string;
}

/**
 * the connection and metadata details of a app
 */
export interface AppDetails {
  directoryData: DirectoryApp;
  content: WebContents;
}

export enum InstanceTypeEnum {
  Window = 'window',
  Directory = 'directory',
}

/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2020 FINOS FDC3 contributors - see NOTICE file
 */

import { Context, ContextHandler, Listener } from '@finos/fdc3';
import { DirectoryApp } from '/@/directory/directory';

/**
 * An interface that relates an instance of an app to other apps
 */
export interface fdc3AppInstance {
  readonly instanceId: string;
  readonly status: 'ready' | 'loading' | 'unregistered';

  /**
   * Adds a listener for incoming contexts whenever a broadcast happens from this instance.
   */
  addContextListener(handler: ContextHandler): Listener;

  /**
   * Adds a listener for incoming contexts of the specified context type whenever a broadcast happens from this instance.
   */
  addContextListener(contextType: string, handler: ContextHandler): Listener;

  /**
   * Sends the given context to this app instance.
   * The context will be recieved on the applicable contextListener for the instance.
   */
  broadcast(context: Context): void;

  /**
   *
   */
  onStatusChanged(handler: (newVal: string, oldVal: string) => void): void;
}
