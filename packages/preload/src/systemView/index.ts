import { connect, createAPI } from '../fdc3-2.0/api';
import { contextBridge } from 'electron';
import { api } from '../system/api';
connect();
//listen();
//document.addEventListener('DOMContentLoaded', createAPI);

/* expose the fdc3 api across the context isolation divide...*/

console.log('creating FDC3 API');
const DesktopAgent = createAPI();
contextBridge.exposeInMainWorld('sail', api);
contextBridge.exposeInMainWorld('fdc3', DesktopAgent);
