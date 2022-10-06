import { getRuntime } from '../../index';
import { resolveIntent } from './resolveIntent';

export const FDC3_TOPICS = {
  RESOLVE_INTENT: 'fdc3:resolveIntent',
};

export const register = () => {
  const runtime = getRuntime();

  runtime.addHandler(FDC3_TOPICS.RESOLVE_INTENT, resolveIntent);
};
