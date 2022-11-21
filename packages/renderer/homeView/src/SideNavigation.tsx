import React from 'react';
import './SideNavigation.css';

export default function SideNavigation() {
  return (
    <div className="sideNavigationContainer">
      <h3 style={{ marginLeft: '10px' }}>App Directory</h3>
      <br />
      <span style={{ marginLeft: '10px' }}>FINOS Directory</span>
      <br />
      <br />
      <span style={{ marginLeft: '10px' }}>Local Directory</span>
    </div>
  );
}
