import { createContext } from 'react';
import { MapLayers } from '../types';

export interface WorkspaceStatus {
  message: string;
  type: 'info' | 'success' | 'error' | 'loading';
  isDirty?: boolean;
}

export interface WorkspaceContextType {
  mapLayers: MapLayers;
  setMapLayers: React.Dispatch<React.SetStateAction<MapLayers>>;
  status: WorkspaceStatus | null;
  setStatus: React.Dispatch<React.SetStateAction<WorkspaceStatus | null>>;
  quickMode: 'add-stop' | 'add-route' | null;
  setQuickMode: React.Dispatch<React.SetStateAction<'add-stop' | 'add-route' | null>>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  selectedEntityId: number | null;
  setSelectedEntityId: (id: number | null) => void;
  hoveredEntityId: number | null;
  setHoveredEntityId: (id: number | null) => void;
  onMapClick: ((latlng: { lat: number, lng: number }) => void) | null;
  setOnMapClick: (cb: ((latlng: { lat: number, lng: number }) => void) | null) => void;
  onShapePointMove?: (index: number, latlng: { lat: number, lng: number }) => void;
  setOnShapePointMove: (cb?: (index: number, latlng: { lat: number, lng: number }) => void) => void;
  onShapePointDelete?: (index: number) => void;
  setOnShapePointDelete: (cb?: (index: number) => void) => void;
  onShapePointInsert?: (index: number, latlng: { lat: number, lng: number }) => void;
  setOnShapePointInsert: (cb?: (index: number, latlng: { lat: number, lng: number }) => void) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);
