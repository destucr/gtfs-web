import React, { createContext, useContext, useState } from 'react';

const WorkspaceContext = createContext();

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

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (!context) throw new Error("useWorkspace must be used within a WorkspaceProvider");
  return context;
};