import { connect, createAPI } from '../view/api';
import { contextBridge } from 'electron';
import { getApps } from './api';
connect();
//listen();
//document.addEventListener('DOMContentLoaded', createAPI);

/* expose the fdc3 api across the context isolation divide...*/
contextBridge.exposeInMainWorld('home', { getApps: getApps });
const DesktopAgent = createAPI();
contextBridge.exposeInMainWorld('fdc3', DesktopAgent);
