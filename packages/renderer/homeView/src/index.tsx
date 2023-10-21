import React from 'react';
import { createRoot } from 'react-dom/client';
import DirectoryView from './DirectoryView';
import './index.css';
// import SideNavigation from './SideNavigation';

const node = document.getElementById('homeView');
if (node) {
  const root = createRoot(node);
  root.render(
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
  );
}
