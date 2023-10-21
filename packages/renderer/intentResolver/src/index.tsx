import React from 'react';
import { createRoot } from 'react-dom/client';
import { IntentResolver } from './IntentResolver';
import './index.css';

const node = document.getElementById('intentResults');
if (node) {
  const root = createRoot(node);
  root.render(
    <React.StrictMode>
      <IntentResolver />
    </React.StrictMode>,
  );
}
