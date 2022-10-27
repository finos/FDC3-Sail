import { connect, createAPI } from '../fdc3-2.0/api';
import { contextBridge } from 'electron';
import { api } from '../system/api';
connect();
//listen();
//document.addEventListener('DOMContentLoaded', createAPI);

/* expose the fdc3 api across the context isolation divide...*/
contextBridge.exposeInMainWorld('sail', api);
const DesktopAgent = createAPI();
contextBridge.exposeInMainWorld('fdc3', DesktopAgent);
