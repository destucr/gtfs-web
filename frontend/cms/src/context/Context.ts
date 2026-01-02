import { createContext, Context } from 'react';
import { MapLayers } from '../types';

export interface WorkspaceContextType {
  mapLayers: MapLayers;
  setMapLayers: React.Dispatch<React.SetStateAction<MapLayers>>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);