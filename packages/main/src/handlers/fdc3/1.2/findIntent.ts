import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { AppIntent, AppMetadata, ResolveError } from 'fdc3-1.2';
import { DirectoryApp, DirectoryIntent } from '/@/directory/directory';

function convertApp(a: DirectoryApp): AppMetadata {
  return {
    name: a.name ?? a.appId ?? '',
    title: a.title,
    description: a.description,
    icons: a?.icons?.map((i) => i.src ?? '') ?? [],
  };
}

export const findIntent = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const intent = message.data && message.data.intent;
  const context = message.data && message.data.context;
  if (intent) {
    const dir = runtime.getDirectory();
    const result = dir.retrieveByIntentAndContextType(
      intent,
      context == undefined ? null : context.type,
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
  }
};

export const findIntentsByContext = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const context = message.data && message.data.context;

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
