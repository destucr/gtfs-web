import React, { useState, useCallback } from 'react';
import { WorkspaceContext, WorkspaceContextType, WorkspaceStatus } from './Context';
import { MapLayers } from '../types';

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [status, setStatus] = useState<WorkspaceStatus | null>(null);
  const [quickMode, setQuickMode] = useState<'add-stop' | 'add-route' | null>(null);
  const [selectedEntityId, setSelectedEntityId] = useState<number | null>(null);
  const [hoveredEntityId, setHoveredEntityId] = useState<number | null>(null);

  // Raw states for handlers
  const [onMapClick, setOnMapClickRaw] = useState<((latlng: { lat: number, lng: number }) => void) | null>(null);
  const [onShapePointMove, setOnShapePointMoveRaw] = useState<((index: number, latlng: { lat: number, lng: number }) => void) | undefined>();
  const [onShapePointDelete, setOnShapePointDeleteRaw] = useState<((index: number) => void) | undefined>();
  const [onShapePointInsert, setOnShapePointInsertRaw] = useState<((index: number, latlng: { lat: number, lng: number }) => void) | undefined>();

  // Optimized setters that prevent the functional-update "Double-Wrapping" bug
  const setOnMapClick = useCallback((cb: ((latlng: { lat: number, lng: number }) => void) | null) => {
    setOnMapClickRaw(() => cb);
  }, []);

  const setOnShapePointMove = useCallback((cb?: (index: number, latlng: { lat: number, lng: number }) => void) => {
    setOnShapePointMoveRaw(() => cb);
  }, []);

  const setOnShapePointDelete = useCallback((cb?: (index: number) => void) => {
    setOnShapePointDeleteRaw(() => cb);
  }, []);

  const setOnShapePointInsert = useCallback((cb?: (index: number, latlng: { lat: number, lng: number }) => void) => {
    setOnShapePointInsertRaw(() => cb);
  }, []);

  const [mapLayers, setMapLayers] = useState<MapLayers>({
    routes: [],
    stops: [],
    focusedPoints: [],
    activeShape: [],
    activeStop: null,
  });

  const value: WorkspaceContextType = {
    mapLayers, setMapLayers,
    sidebarOpen, setSidebarOpen,
    onMapClick, setOnMapClick,
    onShapePointMove, setOnShapePointMove,
    onShapePointDelete, setOnShapePointDelete,
    onShapePointInsert, setOnShapePointInsert,
    status, setStatus,
    quickMode, setQuickMode,
    selectedEntityId, setSelectedEntityId,
    hoveredEntityId, setHoveredEntityId
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};
