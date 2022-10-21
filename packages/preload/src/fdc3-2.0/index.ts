import { connect, createAPI } from './api';
import { contextBridge } from 'electron';
connect();
//listen();
//document.addEventListener('DOMContentLoaded', createAPI);
const DesktopAgent = createAPI();
/* expose the fdc3 api across the context isolation divide...*/
contextBridge.exposeInMainWorld('fdc3', DesktopAgent);
