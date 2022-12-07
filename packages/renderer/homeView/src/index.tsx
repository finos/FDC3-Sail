import React from 'react';
import ReactDOM from 'react-dom';
import DirectoryView from './DirectoryView';
import './index.css';
// import SideNavigation from './SideNavigation';

ReactDOM.render(
  <React.StrictMode>
    <div className="flex">
      {/* <SideNavigation /> */}
      <div className="rightContainer flex-grow overflow-y-hidden">
        {/* 
        
        // TODO: Implement search bar

        <div className="text-white h-10 border-[#333] border-b-2 pl-2 pt-2  select-none">
          Search
        </div>
        */}
        <DirectoryView />
      </div>
    </div>
  </React.StrictMode>,
  document.getElementById('homeView'),
);
