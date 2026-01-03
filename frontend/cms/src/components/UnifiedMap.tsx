import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { useWorkspace } from '../context/useWorkspace';
import 'leaflet/dist/leaflet.css';

const BusStopIcon = L.divIcon({
  className: 'custom-stop-icon',
  html: `<div class="w-4 h-4 bg-orange-500 border-2 border-white rounded-full shadow-lg flex items-center justify-center">
            <div class="w-1 h-1 bg-white rounded-full"></div>
          </div>`,
  iconSize: [16, 16],
  iconAnchor: [8, 8]
});

const MapController: React.FC = () => {
  const { mapLayers } = useWorkspace();
  const map = useMap();

  useEffect(() => {
    if (mapLayers.focusedPoints && mapLayers.focusedPoints.length > 0) {
      const bounds = L.latLngBounds(mapLayers.focusedPoints);
      map.flyToBounds(bounds, { padding: [50, 50], duration: 1.5 });
    }
  }, [mapLayers.focusedPoints, map]);

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
  const { mapLayers, onShapePointMove, onShapePointDelete, onShapePointInsert, onMapClick } = useWorkspace();

  return (
    <div className="w-full h-full relative bg-zinc-100">
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
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
          attribution="&copy; CARTO"
        />

        {/* Halo Layer */}
        {mapLayers.previewRoutes?.map(route => (
          <Polyline
            key={`halo-${route.id}`}
            positions={route.positions}
            pathOptions={{
              color: 'white',
              weight: 8,
              opacity: 0.6,
              lineCap: 'round'
            }}
          />
        ))}

        {/* Preview Layer */}
        {mapLayers.previewRoutes?.map(route => (
          <Polyline
            key={`preview-${route.id}`}
            positions={route.positions}
            pathOptions={{
              color: `#${route.color.replace('#', '')}`,
              weight: 4,
              opacity: 0.8,
              lineCap: 'round'
            }}
          />
        ))}

        {/* Registry Routes */}
        {mapLayers.routes.map(route => (
          <Polyline
            key={route.id}
            positions={route.positions}
            pathOptions={{
              color: `#${route.color.replace('#', '')}`,
              weight: 4,
              opacity: route.isFocused ? 1 : 0.3
            }}
          />
        ))}

        {/* Registry Stops */}
        {mapLayers.stops
          .filter(stop => !mapLayers.activeStop || stop.id !== mapLayers.activeStop.id)
          .map(stop => (
            <Marker
              key={stop.id}
              position={[stop.lat, stop.lon]}
              icon={stop.isCustom ? stop.icon : (stop.isSmall ? L.divIcon({ className: 'bg-white border-2 border-black/20 w-2 h-2 rounded-full', iconSize: [8, 8] }) : BusStopIcon)}
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
              className: 'bg-system-blue border-2 border-white w-3 h-3 rounded-full shadow-lg',
              iconSize: [12, 12]
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
                className: 'bg-white border-2 border-system-blue/40 w-2 h-2 rounded-full opacity-0 hover:opacity-100 transition-opacity cursor-pointer',
                iconSize: [8, 8]
              })}
              eventHandlers={{
                click: (e) => {
                  if (onShapePointInsert) onShapePointInsert(i + 1, e.latlng);
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
              html: `<div class="flex items-center justify-center">
                                    <div class="absolute w-6 h-6 bg-system-blue/30 rounded-full animate-ping"></div>
                                    <div class="w-3 h-3 bg-system-blue border-2 border-white rounded-full shadow-lg relative z-10"></div>
                                   </div>`,
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