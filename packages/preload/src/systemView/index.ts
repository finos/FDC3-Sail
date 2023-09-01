import { createAPI } from '../fdc3-1.2/api';
import { connect } from '../fdc3-1.2/connect'
import { contextBridge, ipcRenderer } from 'electron';
import { api } from '../system/api';
import { sendMessage } from '../lib/lib';
connect(ipcRenderer);
//listen();
//document.addEventListener('DOMContentLoaded', createAPI);

/* expose the fdc3 api across the context isolation divide...*/

console.log('creating FDC3 API');
const DesktopAgent = createAPI(sendMessage, ipcRenderer);
contextBridge.exposeInMainWorld('sail', api);
contextBridge.exposeInMainWorld('fdc3', DesktopAgent);
