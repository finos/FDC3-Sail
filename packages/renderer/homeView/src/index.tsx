import React from 'react';
import ReactDOM from 'react-dom';
import { DirectoryView } from './DirectoryView';
import './index.css';
import SideNavigation from './SideNavigation';

ReactDOM.render(
  <React.StrictMode>
    <div className="container">
      <SideNavigation />
      <DirectoryView />
    </div>
  </React.StrictMode>,
  document.getElementById('homeView'),
);
