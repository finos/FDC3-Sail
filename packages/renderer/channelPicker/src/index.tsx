import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import { Picker } from './Picker';

const node = document.getElementById('picker');
if (node) {
  const root = createRoot(node);

  root.render(
    <React.StrictMode>
      <Picker />
    </React.StrictMode>,
  );
}
