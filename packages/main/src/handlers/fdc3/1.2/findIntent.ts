import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { AppIntent, AppMetadata } from 'fdc3-1.2';
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
    const result = runtime
      .getDirectory()
      .retrieveByIntentAndContextType(intent, context.type);

    const intentDisplayName =
      runtime.getDirectory().retreiveAllIntentsByName(intent)[0]?.displayName ??
      intent;

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
    const d: Array<DirectoryApp> = runtime
      .getDirectory()
      .retrieveByContextType(context.type);

    const matches: { [intentName: string]: DirectoryApp[] } = {};
    const intentData: { [intentName: string]: DirectoryIntent } = {};

    d.forEach((app) => {
      const intents = app?.interop?.intents?.listensFor ?? {};
      Object.keys(intents).forEach((intent) => {
        const values = intents[intent];
        values
          .filter((id) => id.contexts.includes(context.type))
          .forEach((id) => {
            if (!intentData[intent]) {
              intentData[intent] = id;
            }

            if (!matches[intent]) {
              matches[intent] = [];
            }

            matches[intent].push(app);
          });
      });
    });

    const result: AppIntent[] = Object.keys(matches).map((k) => {
      return {
        intent: {
          name: k,
          displayName: intentData[k].displayName,
        },
        apps: matches[k].map((a) => convertApp(a)),
      } as AppIntent;
    });

    return result;
  } else {
    return [];
  }
};
