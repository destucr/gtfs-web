import React, { useState, ReactNode } from 'react';
import { WorkspaceContext } from './Context';
import { MapLayers } from '../types';

export const WorkspaceProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [mapLayers, setMapLayers] = useState<MapLayers>({
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
