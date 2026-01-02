import React, { useState } from 'react';
import { WorkspaceContext } from './Context';

export const WorkspaceProvider = ({ children }) => {
  const [mapLayers, setMapLayers] = useState({
    routes: [], 
    stops: [],  
    focusedPoints: [],
    activeShape: [],
  });

  return (
    <WorkspaceContext.Provider value={{ mapLayers, setMapLayers }}>
      {children}
    </WorkspaceContext.Provider>
  );
};