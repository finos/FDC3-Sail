import { app } from 'electron';
import './security-restrictions';
import { restoreOrCreateWindow } from '/@/mainWindow';
import {Runtime} from './runtime';


let runtime : Runtime | null = null;

const createWindow = () => {
  //const win = runtime.createWorkspace();
  console.log("create initial workspace and view");
  //win.addTab(VIEW_WEBPACK_ENTRY);
  if (runtime){
    const url = new URL(
      '../view/dist/index.html',
      'file://' + __dirname,
    ).toString();
    runtime.createView(url);
  }
};

/**
 * fetch the singleton runtime instance
 */
export const getRuntime = () : Runtime  => {
  if (!runtime){ 
    runtime = new Runtime(app);
  }
  return runtime;
}

/**
 * Prevent multiple instances
 */
const isSingleInstance = app.requestSingleInstanceLock();
if (!isSingleInstance) {
  app.quit();
  process.exit(0);
}
app.on('second-instance', restoreOrCreateWindow);

/**
 * Disable Hardware Acceleration for more power-save
 */
app.disableHardwareAcceleration();

/**
 * Shout down background process if all windows was closed
 */
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

/**
 * @see https://www.electronjs.org/docs/v14-x-y/api/app#event-activate-macos Event: 'activate'
 */
app.on('activate', () => {
  runtime = new Runtime(app);
  restoreOrCreateWindow();
}
  );

/**
 * Create app window when background process will be ready
 */
app
  .whenReady()
  .then(() => {
    runtime = new Runtime(app);
   // restoreOrCreateWindow();
   createWindow();
   
  })
  .catch((e) => console.error('Failed create window:', e));

/**
 * Install Vue.js or some other devtools in development mode only
 */
if (import.meta.env.DEV) {
  app
    .whenReady()
    .then(() => import('electron-devtools-installer'))
    .then(({ default: installExtension, REACT_DEVELOPER_TOOLS }) =>
      installExtension(REACT_DEVELOPER_TOOLS, {
        loadExtensionOptions: {
          allowFileAccess: true,
        },
      }),
    )
    .catch((e) => console.error('Failed install extension:', e));
}

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
