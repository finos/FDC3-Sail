import React from 'react';
import ReactDOM from 'react-dom';
import {IntentResolver} from './IntentResolver';
import './index.css';

ReactDOM.render(
  <React.StrictMode>
    <IntentResolver />
  </React.StrictMode>,
  document.getElementById('intentResults'),
);