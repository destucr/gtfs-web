import React, { useState } from 'react';
import { WorkspaceContext } from './Context';
import { MapLayers } from '../types';

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {

  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [onMapClick, setOnMapClick] = useState<((latlng: { lat: number, lng: number }) => void) | null>(null);

  const [onShapePointMove, setOnShapePointMove] = useState<((index: number, latlng: { lat: number, lng: number }) => void) | undefined>();

    const [onShapePointDelete, setOnShapePointDelete] = useState<((index: number) => void) | undefined>();

    const [onShapePointInsert, setOnShapePointInsert] = useState<((index: number, latlng: { lat: number, lng: number }) => void) | undefined>();

    const [mapLayers, setMapLayers] = useState<MapLayers>({

  

    routes: [], 

    stops: [],  

    focusedPoints: [],

    activeShape: [],

    activeStop: null,

  });



  return (

    <WorkspaceContext.Provider value={{ 

      mapLayers, setMapLayers, 

      sidebarOpen, setSidebarOpen, 

            onMapClick, setOnMapClick,

            onShapePointMove, setOnShapePointMove,

            onShapePointDelete, setOnShapePointDelete,

            onShapePointInsert, setOnShapePointInsert

          }}>

      

      {children}

    </WorkspaceContext.Provider>

  );

};
