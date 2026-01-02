import { createContext } from 'react';
import { MapLayers } from '../types';

export interface WorkspaceStatus {
  message: string;
  type: 'info' | 'success' | 'loading' | 'error';
  isDirty?: boolean;
}

export interface WorkspaceContextType {
  mapLayers: MapLayers;
  setMapLayers: React.Dispatch<React.SetStateAction<MapLayers>>;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  onMapClick: ((latlng: { lat: number, lng: number }) => void) | null;
  setOnMapClick: (callback: ((latlng: { lat: number, lng: number }) => void) | null) => void;
  // Shape Editing Callbacks
  onShapePointMove?: (index: number, latlng: { lat: number, lng: number }) => void;
  setOnShapePointMove: (callback: ((index: number, latlng: { lat: number, lng: number }) => void) | undefined) => void;
  onShapePointDelete?: (index: number) => void;
  setOnShapePointDelete: (callback: ((index: number) => void) | undefined) => void;
  onShapePointInsert?: (index: number, latlng: { lat: number, lng: number }) => void;
  setOnShapePointInsert: (callback: ((index: number, latlng: { lat: number, lng: number }) => void) | undefined) => void;
  // UX Feedback
  status: WorkspaceStatus | null;
  setStatus: (status: WorkspaceStatus | null) => void;
  // Quick Actions
  quickMode: 'add-stop' | 'add-route' | null;
  setQuickMode: (mode: 'add-stop' | 'add-route' | null) => void;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);