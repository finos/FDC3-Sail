import React from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import TopNavigation from './TopNavigation';

const node = document.getElementById('topNavigation');
if (node) {
  const root = createRoot(node);
  root.render(
    <React.StrictMode>
      <TopNavigation />
    </React.StrictMode>,
  );
}
