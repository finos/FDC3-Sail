import { DirectoryApp } from '../types/FDC3Data';

/**
 * A loader takes a URL and attempts to load it into an array of DirectoryApp.
 * If it can't do this for any reason, it returns the empty array.
 */
type Loader = (url: string) => Promise<DirectoryApp[]>;

export class Directory {
  loaders: Loader[];
  urls: string[];
  apps: DirectoryApp[] = [];

  constructor(urls: string[], loaders: Loader[]) {
    this.loaders = loaders;
    this.urls = urls;
    this.reload();
  }

  /**
   * Asynchronously reloads the entire app list
   */
  reload() {
    const newApps: DirectoryApp[] = [];
    this.urls.forEach((url) => this.load(url));
    this.apps = newApps;

    Promise.all(this.urls.map((u) => this.load(u)))
      .then((data) => data.flatMap((d) => d))
      .then((result) => {
        this.apps = result;
      });
  }

  /**
   * Loads from a given url, using available loaders.  Places loaded apps into 'into'
   */
  load(url: string): Promise<DirectoryApp[]> {
    return Promise.all(this.loaders.map((l) => l(url))).then((data) =>
      data.flatMap((d) => d),
    );
  }

  /**
   * Generic retrieve that returns a filtered list of apps based on a
   * filter function.
   */
  retrieve(filter: (d: DirectoryApp) => boolean): DirectoryApp[] {
    return this.apps.filter(filter);
  }
}
