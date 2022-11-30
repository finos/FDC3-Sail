import { components } from './generated-schema';

/**
 * Replace this with the actual definition
 */
type schemas = components['schemas'];
export type DirectoryApp = schemas['Application'];
export type DirectoryIcon = schemas['Icon'];
export type DirectoryScreenshot = schemas['Screenshot'];
export type DirectoryInterop = schemas['Interop'];
export type DirectoryIntent = schemas['Intent'] & {
  // this allows us to refer back to the app creating this intent
  app: DirectoryApp;
};
export type DirectoryAppLaunchDetails = schemas['LaunchDetails'];
export type DirectoryAppLaunchDetailsWeb = schemas['WebAppDetails'];
export type HostManifest = schemas['HostManifest'];
export type DirectoryAppSailManifest = {
  injectApi: string;
  searchable: boolean;
  forceNewWindow: boolean;
  framesApi: boolean;
};

/**
 * A loader takes a URL and attempts to load it into an array of DirectoryApp.
 * If it can't do this for any reason, it returns the empty array.
 */
export type Loader = (url: string) => Promise<DirectoryApp[]>;

export class Directory {
  loaders: Loader[];
  urls: string[];
  apps: DirectoryApp[] = [];
  fullText: Map<string, DirectoryApp>;

  constructor(urls: string[], loaders: Loader[]) {
    this.loaders = loaders;
    this.urls = urls;
    this.fullText = new Map();
  }

  /**
   * Asynchronously reloads the entire app list
   */
  async reload(): Promise<number> {
    return Promise.all(this.urls.map((u) => this.load(u)))
      .then((data) =>
        data.flatMap((d) => {
          return d;
        }),
      )
      .then((result) => {
        this.apps = result;
        this.fullText = new Map(result.map((o) => [JSON.stringify(o), o]));
        console.log('Loaded ' + result.length + ' apps');
        return result.length;
      })
      .catch((err) => {
        console.error('Problem loading app directory: ' + err);
        throw err;
      });
  }

  /**
   * Loads from a given url, using available loaders.  Places loaded apps into 'into'
   */
  load(url: string): Promise<DirectoryApp[]> {
    console.log('Loading');
    const individualLoaders: Promise<DirectoryApp[]>[] = this.loaders.map((l) =>
      l(url),
    );

    return Promise.all(individualLoaders)
      .then((data) => {
        console.log('Coalescing');
        return data.flatMap((d) => d);
      })
      .catch((err) => {
        console.log('Problem loading: ' + url);
        throw err;
      });
  }

  /**
   * Generic retrieve that returns a filtered list of apps based on a
   * filter function.
   */
  retrieve(filter: (d: DirectoryApp) => boolean): DirectoryApp[] {
    return this.retrieveAll().filter(filter);
  }

  retrieveAll(): DirectoryApp[] {
    return this.apps.filter((d) => d.type == 'web');
  }

  /**
   * For FDC3 1.2, retreives by the name of the app
   */
  retrieveByName(name: string): DirectoryApp[] {
    return this.retrieve((app) => app.name === name);
  }

  /**
   * For FDC3 2, retrieves by appId
   */
  retrieveByAppId(appId: string): DirectoryApp[] {
    return this.retrieve((app) => app.appId === appId);
  }

  retrieveByContextType(contextType: string): DirectoryApp[] {
    return this.retrieve((d) => {
      const listensFor = Object.values(d.interop?.intents?.listensFor ?? {});
      const listensForFlat = listensFor.flatMap((i) => i);
      const foundContextTypes = listensForFlat.filter((i) =>
        i.contexts.includes(contextType),
      );
      return foundContextTypes.length > 0;
    });
  }

  retrieveByIntentAndContextType(
    intent: string | null = null,
    contextType: string | null = null,
  ): DirectoryApp[] {
    return this.retrieve((d) => {
      const listensFor = d.interop?.intents?.listensFor ?? {};
      if (intent && contextType) {
        const theIntent = listensFor[intent] as DirectoryIntent;
        return theIntent && theIntent.contexts.includes(contextType);
      } else if (intent != null) {
        if (!Object.keys(listensFor).includes(intent)) {
          return false;
        }
      } else if (contextType != null) {
        return (
          Object.values(listensFor).filter((v) =>
            v.contexts.includes(contextType),
          ).length > 0
        );
      }

      return true;
    });
  }

  retrieveByQuery(query: string): DirectoryApp[] {
    if (!query || query.trim().length == 0) {
      return this.retrieveAll();
    }
    const terms = query.split(' ');
    const keys: string[] = Array.from(this.fullText.keys());
    const matches: DirectoryApp[] = keys
      .filter((k) => {
        // must match all terms
        return terms.filter((t) => k.includes(t)).length == terms.length;
      })
      .map((k) => {
        const entry = this.fullText.get(k) as DirectoryApp;
        return entry;
      });

    return matches;
  }

  retrieveAllIntents(): { [index: string]: DirectoryIntent[] } {
    const out: { [index: string]: DirectoryIntent[] } = {};

    this.retrieveAll().forEach((d) => {
      const lf = d.interop?.intents?.listensFor ?? {};
      Object.keys(lf).forEach((intent) => {
        const intentData = { ...lf[intent] } as DirectoryIntent;
        intentData.app = d;
        if (!out[intent]) {
          out[intent] = [];
        }

        out[intent].push(intentData);
      });
    });

    return out;
  }

  retrieveAllIntentsByName(i: string): DirectoryIntent[] {
    return this.retrieveAllIntents()[i];
  }

  retrieveAllIntentsByContext(contextType: string): {
    [index: string]: DirectoryIntent[];
  } {
    const all = this.retrieveAllIntents();
    const out: { [index: string]: DirectoryIntent[] } = {};

    Object.keys(all).forEach((k) => {
      const intentValues = all[k];
      intentValues
        .filter((intent) => intent.contexts.includes(contextType))
        .forEach((i) => {
          if (out[k] == undefined) {
            out[k] = [i];
          } else {
            out[k].push(i);
          }
        });
    });

    return out;
  }
}

export function getSailManifest(d: DirectoryApp): DirectoryAppSailManifest {
  // because of defaulting, this should always return something
  return d.hostManifests?.sail as DirectoryAppSailManifest;
}
