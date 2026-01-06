import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useWorkspace } from '../context/useWorkspace';
import 'leaflet/dist/leaflet.css';

// Industrial Palette Standards
const COLORS = {
  blue: '#007AFF',
  orange: '#F97316',
  white: '#FFFFFF',
  zinc400: '#A1A1AA',
  zinc100: '#F4F4F5'
};

const BusStopIcon = L.divIcon({
  className: 'custom-stop-icon',
  html: `<div style="width: 16px; height: 16px; background-color: ${COLORS.orange}; border: 2px solid white; border-radius: 9999px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1); display: flex; align-items: center; justify-content: center;">
            <div style="width: 4px; height: 4px; background-color: white; border-radius: 9999px;"></div>
          </div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const MapController: React.FC = () => {
  const { mapLayers, sidebarOpen } = useWorkspace();
  const map = useMap();

  useEffect(() => {
    if (mapLayers.focusedPoints && mapLayers.focusedPoints.length > 0) {
      const bounds = L.latLngBounds(mapLayers.focusedPoints);
      map.flyToBounds(bounds, { 
        paddingTopLeft: [sidebarOpen ? 440 : 40, 40],
        paddingBottomRight: [360, 40],
        duration: 0.5,
        maxZoom: 16
      });
    }
  }, [mapLayers.focusedPoints, map, sidebarOpen]);

  return null;
};

const MapEvents: React.FC = () => {
  const { onMapClick } = useWorkspace();
  useMapEvents({
    click(e) {
      if (onMapClick) onMapClick(e.latlng);
    }
  });
  return null;
};

const UnifiedMap: React.FC = () => {
  const { mapLayers, onShapePointMove, onShapePointDelete, onShapePointInsert, onMapClick, settings } = useWorkspace();
  const isDark = settings['dark_mode'] === 'true';

  return (
    <div className="w-full h-full relative bg-zinc-100 dark:bg-zinc-900">
      <MapContainer
        center={[-7.393, 109.360] as [number, number]}
        zoom={14}
        zoomControl={false}
        className="w-full h-full"
        style={{ height: '100%', width: '100%' }}
      >
        <MapController />
        <MapEvents />
        <TileLayer
          url={isDark 
            ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
            : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          }
          attribution="&copy; CARTO"
        />

        {/* Halo Layer */}
        {mapLayers.previewRoutes?.map(route => route.positions.length > 0 && (
          <Polyline
            key={`halo-${route.id}-${route.positions.length}`}
            positions={route.positions}
            smoothFactor={0}
            pathOptions={{
              color: 'white',
              weight: 8,
              opacity: 0.6,
              lineCap: 'round'
            }}
          />
        ))}

        {/* Preview Layer */}
        {mapLayers.previewRoutes?.map(route => {
          if (!route.positions || route.positions.length === 0) return null;
          const color = route.color ? (route.color.startsWith('#') ? route.color : `#${route.color}`) : '#007AFF';
          return (
            <Polyline
              key={`preview-${route.id}-${route.positions.length}`}
              positions={route.positions}
              smoothFactor={0}
              pathOptions={{
                color: color,
                weight: 4,
                opacity: 0.8,
                lineCap: 'round'
              }}
            />
          );
        })}

        {/* Registry Routes */}
        {mapLayers.routes.map(route => {
          if (!route.positions || route.positions.length === 0) return null;
          const color = route.color ? (route.color.startsWith('#') ? route.color : `#${route.color}`) : '#007AFF';
          return (
            <Polyline
              key={`route-${route.id}-${route.positions.length}`}
              positions={route.positions}
              smoothFactor={0}
              pathOptions={{
                color: color,
                weight: 4,
                opacity: route.isFocused ? 1 : 0.3
              }}
            />
          );
        })}

        {/* Registry Stops */}
        {mapLayers.stops
          .filter(stop => !mapLayers.activeStop || stop.id !== mapLayers.activeStop.id)
          .map(stop => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lon]}
              icon={stop.isCustom ? stop.icon : (stop.isSmall ? L.divIcon({ 
                className: '', 
                html: `<div style="background-color: white; border: 2px solid rgba(0,0,0,0.2); width: 8px; height: 8px; border-radius: 9999px;"></div>`,
                iconSize: [8, 8],
                iconAnchor: [4, 4]
              }) : BusStopIcon)}
            />
          ))}

        {/* Active Shape Editor */}
        {mapLayers.activeShape.map((p, i) => (
          <Marker
            key={`shape-${i}`}
            position={[p.lat, p.lon]}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                if (onShapePointMove) onShapePointMove(i, e.target.getLatLng());
              },
              contextmenu: () => {
                if (onShapePointDelete) onShapePointDelete(i);
              }
            }}
            icon={L.divIcon({
              className: '',
              html: `<div style="background-color: ${COLORS.blue}; border: 2px solid white; width: 12px; height: 12px; border-radius: 9999px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);"></div>`,
              iconSize: [12, 12],
              iconAnchor: [6, 6]
            })}
          />
        ))}

        {/* Insertion points */}
        {mapLayers.activeShape.length > 1 && mapLayers.activeShape.slice(0, -1).map((p, i) => {
          const next = mapLayers.activeShape[i + 1];
          const midLat = (p.lat + next.lat) / 2;
          const midLon = (p.lon + next.lon) / 2;
          return (
            <Marker
              key={`mid-${i}`}
              position={[midLat, midLon]}
              icon={L.divIcon({
                className: 'custom-mid-icon',
                html: `<div style="background-color: white; border: 2px solid rgba(0,122,255,0.4); width: 8px; height: 8px; border-radius: 9999px; opacity: 0; transition: opacity 0.2s;"></div>`,
                iconSize: [8, 8],
                iconAnchor: [4, 4]
              })}
              eventHandlers={{
                click: (e) => {
                  if (onShapePointInsert) onShapePointInsert(i + 1, e.latlng);
                },
                mouseover: (e) => {
                  const el = e.target.getElement();
                  if (el && el.firstChild) (el.firstChild as HTMLElement).style.opacity = '1';
                },
                mouseout: (e) => {
                  const el = e.target.getElement();
                  if (el && el.firstChild) (el.firstChild as HTMLElement).style.opacity = '0';
                }
              }}
            />
          );
        })}

        {/* Active Stop */}
        {mapLayers.activeStop && (
          <Marker
            position={[mapLayers.activeStop.lat, mapLayers.activeStop.lon]}
            draggable={true}
            eventHandlers={{
              dragend: (e) => {
                if (onMapClick) onMapClick(e.target.getLatLng());
              }
            }}
            icon={L.divIcon({
              className: 'relative',
              html: `<div style="display: flex; align-items: center; justify-content: center; width: 24px; height: 24px;">
                        <div style="position: absolute; width: 24px; height: 24px; background-color: rgba(0,122,255,0.3); border-radius: 9999px; animation: leaflet-ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
                        <div style="width: 12px; height: 12px; background-color: ${COLORS.blue}; border: 2px solid white; border-radius: 9999px; box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1); position: relative; z-index: 10;"></div>
                     </div>
                     <style>
                      @keyframes leaflet-ping {
                        75%, 100% { transform: scale(2); opacity: 0; }
                      }
                     </style>`,
              iconSize: [24, 24],
              iconAnchor: [12, 12]
            })}
          />
        )}
      </MapContainer>
    </div>
  );
};

export default UnifiedMap;