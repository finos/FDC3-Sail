import React from 'react';
import ReactDOM from 'react-dom';
import {SearchResults} from './SearchResults';
import './index.css';

ReactDOM.render(
  <React.StrictMode>
    <SearchResults />
  </React.StrictMode>,
  document.getElementById('searchResults'),
);