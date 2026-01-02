import React, { useEffect, useRef, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useWorkspace } from '../context/useWorkspace';

const BusStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [24, 24], iconAnchor: [12, 24], popupAnchor: [0, -24]
});

const ActiveStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/684/684908.png', // Red pin or similar
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
});

const MapController: React.FC<{ focusedPoints: [number, number][] }> = ({ focusedPoints }) => {
    const map = useMap();
    useEffect(() => {
        if (focusedPoints && focusedPoints.length > 0) {
            const bounds = L.latLngBounds(focusedPoints);
            map.fitBounds(bounds, { padding: [100, 100], animate: true });
        }
    }, [focusedPoints, map]);
    return null;
};

const MapEventListener: React.FC = () => {
    const { onMapClick } = useWorkspace();
    useMapEvents({
        click(e) {
            if (onMapClick) onMapClick(e.latlng);
        }
    });
    return null;
};

const DraggableMarker: React.FC<{ position: [number, number], onDragEnd: (latlng: L.LatLng) => void }> = ({ position, onDragEnd }) => {
    const markerRef = useRef<L.Marker>(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker != null) onDragEnd(marker.getLatLng());
        },
    }), [onDragEnd]);

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            icon={ActiveStopIcon}
            ref={markerRef}
            zIndexOffset={1000}
        />
    );
};

const DraggableShapeMarker: React.FC<{ index: number, position: [number, number], onDragEnd: (index: number, latlng: L.LatLng) => void, onDelete: (index: number) => void }> = ({ index, position, onDragEnd, onDelete }) => {
    const markerRef = useRef<L.Marker>(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker != null) onDragEnd(index, marker.getLatLng());
        },
        contextmenu() {
            onDelete(index);
        }
    }), [index, onDragEnd, onDelete]);

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            icon={L.divIcon({ className: 'bg-white border-2 border-system-blue w-3 h-3 rounded-full shadow-lg cursor-move', iconSize: [12, 12] })}
            ref={markerRef}
            zIndexOffset={500}
        />
    );
};

const UnifiedMap: React.FC = () => {
    const { mapLayers, onMapClick, onShapePointMove, onShapePointDelete, onShapePointInsert } = useWorkspace();

    const handleActiveDrag = (latlng: L.LatLng) => {
        if (mapLayers.activeStop) {
            if (onMapClick) onMapClick({ lat: latlng.lat, lng: latlng.lng });
        }
    };

    const handlePolylineClick = (e: L.LeafletMouseEvent) => {
        if (!onShapePointInsert || mapLayers.activeShape.length < 2) return;
        
        // Find the segment where the click happened
        const clickPt = e.latlng;
        let minDocs = Infinity;
        let insertIndex = -1;

        for (let i = 0; i < mapLayers.activeShape.length - 1; i++) {
            const p1 = mapLayers.activeShape[i];
            const p2 = mapLayers.activeShape[i+1];
            
            // Simple distance to segment
            const dist = L.LineUtil.pointToSegmentDistance(
                L.CRS.EPSG3857.project(clickPt),
                L.CRS.EPSG3857.project(L.latLng(p1.lat, p1.lon)),
                L.CRS.EPSG3857.project(L.latLng(p2.lat, p2.lon))
            );

            if (dist < minDocs) {
                minDocs = dist;
                insertIndex = i + 1;
            }
        }

        if (insertIndex !== -1) {
            onShapePointInsert(insertIndex, { lat: clickPt.lat, lng: clickPt.lng });
        }
    };

    return (
        <MapContainer 
            center={[-7.393, 109.360]} 
            zoom={14} 
            zoomControl={false} 
            className="h-full w-full"
            style={{ height: '100%', width: '100%' }}
        >
            <TileLayer url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" attribution="&copy; CARTO" />
            
            <MapController focusedPoints={mapLayers.focusedPoints} />
            <MapEventListener />

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

            {/* Render Static Stops */}
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

            {/* Draggable Active Stop */}
            {mapLayers.activeStop && (
                <DraggableMarker 
                    position={[mapLayers.activeStop.lat, mapLayers.activeStop.lon]} 
                    onDragEnd={handleActiveDrag} 
                />
            )}

            {/* Active Drawing Layer (Shapes) */}
            {mapLayers.activeShape.length > 1 && (
                <Polyline 
                    positions={mapLayers.activeShape.map(p => [p.lat, p.lon] as [number, number])} 
                    color="#007AFF" 
                    weight={6}
                    eventHandlers={{ click: handlePolylineClick }}
                />
            )}
            {mapLayers.activeShape.map((p, i) => (
                <DraggableShapeMarker 
                    key={`edit-${i}-${p.lat}-${p.lon}`} 
                    index={i} 
                    position={[p.lat, p.lon]} 
                    onDragEnd={(idx, latlng) => onShapePointMove?.(idx, { lat: latlng.lat, lng: latlng.lng })}
                    onDelete={(idx) => onShapePointDelete?.(idx)}
                />
            ))}
        </MapContainer>
    );
};

export default UnifiedMap;