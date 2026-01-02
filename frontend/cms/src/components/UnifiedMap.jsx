import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useWorkspace } from '../context/WorkspaceContext';

const BusStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24]
});

const MapController = ({ focusedPoints }) => {
    const map = useMap();
    useEffect(() => {
        if (focusedPoints && focusedPoints.length > 0) {
            const bounds = L.latLngBounds(focusedPoints);
            map.fitBounds(bounds, { padding: [100, 100], animate: true });
        }
    }, [focusedPoints, map]);
    return null;
};

const UnifiedMap = () => {
    const { mapLayers } = useWorkspace();

    return (
        <MapContainer center={[-7.393, 109.360]} zoom={14} zoomControl={false} className="h-full w-full">
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
            
            <MapController focusedPoints={mapLayers.focusedPoints} />

            {/* Render Polylines */}
            {mapLayers.routes.map(route => (
                <Polyline 
                    key={`route-${route.id}-${route.color}`} 
                    positions={route.positions} 
                    color={`#${route.color.replace('#', '')}`} 
                    weight={route.isFocused ? 8 : 4} 
                    opacity={route.isFocused ? 0.9 : 0.3} 
                    dashArray={route.isFocused ? "" : "10, 10"}
                    lineCap="round"
                />
            ))}

            {/* Render Stops */}
            {mapLayers.stops.map(stop => (
                <Marker 
                    key={`stop-${stop.id}`} 
                    position={[stop.lat, stop.lon]} 
                    icon={stop.isCustom ? stop.icon : (stop.isSmall ? L.divIcon({ className: 'bg-white border-2 border-black/20 w-2 h-2 rounded-full', iconSize: [8,8] }) : BusStopIcon)}
                >
                    {!stop.hidePopup && (
                        <Popup>
                            <div className="font-bold text-xs uppercase">{stop.name}</div>
                        </Popup>
                    )}
                </Marker>
            ))}

            {/* Active Drawing Layer */}
            {mapLayers.activeShape.length > 1 && (
                <Polyline positions={mapLayers.activeShape.map(p => [p.lat, p.lon])} color="#007AFF" weight={6} />
            )}
            {mapLayers.activeShape.map((p, i) => (
                <Marker key={`edit-${i}`} position={[p.lat, p.lon]} icon={L.divIcon({ className: 'bg-white border-2 border-system-blue w-3 h-3 rounded-full shadow-lg', iconSize: [12, 12] })} />
            ))}
        </MapContainer>
    );
};

export default UnifiedMap;
