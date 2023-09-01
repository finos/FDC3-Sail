import { sendMessage } from '../lib/lib';
import { createAPI } from './api';
import { connect } from './connect';
import { contextBridge, ipcRenderer } from 'electron';

connect(ipcRenderer);
//listen();
//document.addEventListener('DOMContentLoaded', createAPI);
const desktopAgent = createAPI(sendMessage, ipcRenderer);
/* expose the fdc3 api across the context isolation divide...*/
contextBridge.exposeInMainWorld('fdc3', desktopAgent);
