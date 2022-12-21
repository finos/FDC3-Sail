import { getRuntime } from '/@/index';
import { AppIntent, AppMetadata, ResolveError } from 'fdc3-1.2';
import { DirectoryApp, DirectoryIntent } from '/@/directory/directory';
import {
  FDC3Message,
  FindIntentData,
  FindIntentContextData,
} from '/@/types/FDC3Message';

function convertApp(a: DirectoryApp): AppMetadata {
  return {
    name: a.name ?? a.appId ?? '',
    title: a.title,
    description: a.description,
    icons: a?.icons?.map((i) => i.src ?? '') ?? [],
  };
}

export const findIntent = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: FindIntentData = message.data as FindIntentData;
  const intent = data.intent;
  const context = data.context;

  const dir = runtime.getDirectory();
  const result = dir.retrieveByIntentAndContextType(
    intent,
    context?.type || null,
  );

  if (result.length == 0) {
    throw new Error(ResolveError.NoAppsFound);
  }

  const intentDisplayName =
    dir.retrieveAllIntentsByName(intent)[0]?.displayName ?? intent;

  const r: AppIntent = {
    intent: { name: intent, displayName: intentDisplayName },
    apps: result.map(convertApp),
  };

  return r;
};

export const findIntentsByContext = async (message: FDC3Message) => {
  const runtime = getRuntime();
  const data: FindIntentContextData = message.data as FindIntentContextData;
  const context = data.context;

  if (context && context.type) {
    const matchingIntents: { [key: string]: DirectoryIntent[] } = runtime
      .getDirectory()
      .retrieveAllIntentsByContext(context.type);

    const result: AppIntent[] = Object.keys(matchingIntents).map((k) => {
      const apps = matchingIntents[k].map((o) => convertApp(o.app));

      return {
        intent: {
          name: k,
          displayName: matchingIntents[k][0].displayName,
        },
        apps: apps,
      } as AppIntent;
    });
    if (result.length > 0) {
      return result;
    }
  }
  throw new Error(ResolveError.NoAppsFound);
};
