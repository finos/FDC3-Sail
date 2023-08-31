import { getRuntime } from '/@/index';
import { DirectoryApp, DirectoryIntent } from '/@/directory/directory';
import {
  FDC3Message,
  FindIntentData,
  FindIntentContextData,
  SailAppIntent,
} from '/@/types/FDC3Message';
import { NoAppsFound } from '/@/types/FDC3Errors'; 

// function convertApp(a: DirectoryApp): SailAppMetadata {
//   return {
//     name: a.name ?? a.appId ?? '',
//     title: a.title,
//     description: a.description,
//     icons: a?.icons?.map((i) => i.src ?? '') ?? [],
//   };
// }

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
    throw new Error(NoAppsFound);
  }

  const intentDisplayName =
    dir.retrieveAllIntentsByName(intent)[0]?.displayName ?? intent;

  const r: SailAppIntent = {
    intent: { name: intent, displayName: intentDisplayName },
    apps: result,
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

    const result: SailAppIntent[] = Object.keys(matchingIntents).map((k) => {
      const apps : DirectoryApp[] = matchingIntents[k].map((o) => o.app);

      return {
        intent: {
          name: k,
          displayName: matchingIntents[k][0].displayName,
        },
        apps: apps,
      } as SailAppIntent;
    });
    if (result.length > 0) {
      return result;
    }
  }
  throw new Error(NoAppsFound);
};
