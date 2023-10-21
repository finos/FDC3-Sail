import { SessionView } from './SessionView';
import React from 'react';
import { createRoot } from 'react-dom/client';

import './index.css';

const node = document.getElementById('sessionView');
if (node) {
  const root = createRoot(node);
  root.render(
    <React.StrictMode>
      <SessionView />
    </React.StrictMode>,
  );
}
