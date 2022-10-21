/**
 * SPDX-License-Identifier: Apache-2.0
 * Copyright 2019 FINOS FDC3 contributors - see NOTICE file
 */

import { AppMetadata } from './AppMetadata';
import { Context } from '@finos/fdc3';

export type TargetApp = string | AppMetadata;
export type ContextHandler = (context: Context) => void;
