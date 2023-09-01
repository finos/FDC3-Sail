import { createAPI } from './api';
import { connect } from '../fdc3-1.2/connect';

import { contextBridge, ipcRenderer } from 'electron';
import { sendMessage } from '../lib/lib';

connect(ipcRenderer);
const DesktopAgent = createAPI(sendMessage, ipcRenderer);
/* expose the fdc3 api across the context isolation divide...*/
contextBridge.exposeInMainWorld('fdc3', DesktopAgent);
