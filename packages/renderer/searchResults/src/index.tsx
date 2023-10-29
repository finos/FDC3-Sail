import React from 'react';
import { createRoot } from 'react-dom/client';
import { SearchResults } from './SearchResults';
import './index.css';

const node = document.getElementById('searchResults');
if (node) {
  const root = createRoot(node);
  root.render(
    <React.StrictMode>
      <SearchResults />
    </React.StrictMode>,
  );
}
