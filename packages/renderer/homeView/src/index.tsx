import React from 'react';
import ReactDOM from 'react-dom';
import DirectoryView from './DirectoryView';
import './index.css';
import SideNavigation from './SideNavigation';

ReactDOM.render(
  <React.StrictMode>
    <div className="flex mx-2 rounded-lg border-gray-800 border-2">
      <SideNavigation />
      <div className="rightContainer border-gray-800 flex-grow overflow-y-hidden">
        <div className="text-white h-10 border-gray-800 border-b-2 pl-2 pt-2">
          Search
        </div>
        <DirectoryView />
      </div>
    </div>
  </React.StrictMode>,
  document.getElementById('homeView'),
);
