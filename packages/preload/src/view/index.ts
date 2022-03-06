import {createAPI} from './api';
import {listen, connect} from './contentConnection';

connect();
listen();
document.addEventListener("DOMContentLoaded",createAPI);