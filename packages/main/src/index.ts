import { app, BrowserWindow } from 'electron';
import './security-restrictions';
//import { restoreOrCreateWindow } from '/@/mainWindow';
import { Runtime } from './runtime';

let runtime: Runtime | null = null;

export const createWindow = (): Promise<BrowserWindow> => {
  return new Promise((resolve, reject) => {
    const runtime = getRuntime();
    let window = BrowserWindow.getAllWindows().find((w) => !w.isDestroyed());

    const focusOrRestore = (window: BrowserWindow) => {
      if (window && window.isMinimized()) {
        window.restore();
      }
      if (window) {
        window.focus();
      }
    };

    if (window === undefined) {
      runtime.createView().then(
        (view) => {
          if (view.parent && view.parent.window) {
            window = view.parent.window;
          }
          if (window) {
            focusOrRestore(window);
            resolve(window);
          } else {
            reject('Window could not be created or restored');
          }
        },
        (err) => {
          reject(err);
        },
      );
    } else {
      if (window) {
        focusOrRestore(window);
        resolve(window);
      } else {
        reject('Window could not be created or restored');
      }
    }
  });
};

/**
 * fetch the singleton runtime instance
 */
export const getRuntime = (): Runtime => {
  if (!runtime) {
    console.log('getRuntime - create runtime');
    runtime = new Runtime();
    runtime.startup();
  }
  return runtime;
};

/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', createWindow);

/**
 * Disable Hardware Acceleration for more power-save
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    if (runtime) {
      runtime.clean();
      runtime = null;
    }
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/v14-x-y/api/app#event-activate-macos Event: 'activate'
 */
app.on('activate', () => {
  console.log('activated');
  if (runtime) {
    runtime.clean();
    runtime = null;
  }
  runtime = new Runtime();
  runtime.startup();
  createWindow();
});

/**
 * Create app window when background process will be ready
 */
app
  .whenReady()
  .then(() => {
    console.log('index - create runtime');
    runtime = new Runtime();
    runtime.startup();
    // restoreOrCreateWindow();
    console.log('index - createWindow');
    createWindow();
  })
  .catch((e) => console.error('Failed create window:', e));

/**
 * Check new app version in production mode only
 */
if (import.meta.env.PROD) {
  app
    .whenReady()
    .then(() => import('electron-updater'))
    .then(({ autoUpdater }) => autoUpdater.checkForUpdatesAndNotify())
    .catch((e) => console.error('Failed check updates:', e));
}
