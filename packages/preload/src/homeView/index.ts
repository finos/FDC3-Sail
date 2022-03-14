import { createAPI } from '../view/api';
import { contextBridge } from 'electron';
import { getApps } from './api';
import { listen, connect } from '../view/contentConnection';

connect();
listen();
document.addEventListener('DOMContentLoaded', createAPI);

contextBridge.exposeInMainWorld('home', { getApps: getApps });
