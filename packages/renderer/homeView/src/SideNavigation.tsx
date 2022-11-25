import React from 'react';

export default function SideNavigation() {
  return (
    <div className="bg-gray-800 text-white flex-col" style={{ width: 900 }}>
      <div className="text-center mt-5">App Directory</div>
      <div className="ml-3 mt-10">FINOS Directory</div>
      <div className="ml-3 mt-5">Local Directory</div>
    </div>
  );
}
