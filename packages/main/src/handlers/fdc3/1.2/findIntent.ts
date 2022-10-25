import { getRuntime } from '/@/index';
import { RuntimeMessage } from '/@/handlers/runtimeMessage';
import { DirectoryApp } from '/@/handlers/fdc3/1.2/types/FDC3Data';
import { AppMetadata } from './types/AppMetadata';
import { AppIntent, IntentMetadata } from 'fdc3-1.2';

export const findIntent = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const intent = message.data && message.data.intent;
  const context = message.data && message.data.context;
  if (intent) {
    let url = `/apps/search?intent=${intent}`;
    if (context) {
      url += `&context=${context.type}`;
    }

    const result: Array<DirectoryApp> =
      ((await runtime.fetchFromDirectory(url)) as Array<DirectoryApp>) || [];

    let r: AppIntent = {
      intent: { name: '', displayName: '' },
      apps: [],
    };

    // r.apps = j;
    //find intent display name from app directory data
    const intnt = result[0].intents.filter((i) => {
      return i.name === intent;
    });
    if (intnt.length > 0) {
      r = {
        intent: {
          name: intnt[0].name,
          displayName: intnt[0].display_name,
        },
        apps: [],
      };
    }

    result.forEach((dirApp) => {
      r.apps.push({
        name: dirApp.name,
        title: dirApp.title,
        description: dirApp.description,
        icons: dirApp.icons.map((icon) => {
          return icon.icon;
        }),
      });
    });
    return r;
  }
};

export const findIntentsByContext = async (message: RuntimeMessage) => {
  const runtime = getRuntime();
  const context = message.data && message.data.context;
  const r: Array<AppIntent> = [];
  if (context && context.type) {
    const url = `/apps/search?context=${context.type}`;
    const result = await runtime.fetchFromDirectory(url);

    const d: Array<DirectoryApp> = result as Array<DirectoryApp>;

    if (d) {
      const found: Map<string, Array<AppMetadata>> = new Map();
      const intents: Array<IntentMetadata> = [];
      d.forEach((item) => {
        const appMeta: AppMetadata = {
          name: item.name,
          title: item.title,
          description: item.description,
          icons: item.icons.map((icon) => {
            return icon.icon;
          }),
        };

        item.intents.forEach((intent) => {
          if (!found.has(intent.name)) {
            intents.push({
              name: intent.name,
              displayName: intent.display_name,
            });
            found.set(intent.name, [appMeta]);
          } else {
            const apps = found.get(intent.name);
            if (apps) {
              apps.push(appMeta);
            }
          }
        });
      });

      intents.forEach((intent) => {
        const apps = found.get(intent.name);
        const entry: AppIntent = { intent: intent, apps: apps || [] };
        r.push(entry);
      });
    }
  }
  return r;
};
