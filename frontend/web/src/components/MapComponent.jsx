import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';

// Fix for default marker icon in React-Leaflet
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

// Custom Bus Stop Icon
const busStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png', // Bus stop icon
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const MapComponent = () => {
    const [routes, setRoutes] = useState([]);
    const [stops, setStops] = useState([]);
    const [shapes, setShapes] = useState({}); // Map shape_id to point array
    const [trips, setTrips] = useState([]);

    const fetchData = async () => {
        try {
            // Fetch basic data
            const [stopsRes, routesRes, tripsRes] = await Promise.all([
                axios.get('http://localhost:8080/api/stops'),
                axios.get('http://localhost:8080/api/routes'),
                axios.get('http://localhost:8080/api/trips')
            ]);

            setStops(stopsRes.data);
            setRoutes(routesRes.data);
            setTrips(tripsRes.data);

            // Fetch shapes for all trips
            const shapeIds = [...new Set(tripsRes.data.map(t => t.shape_id))];
            const shapeData = {};

            await Promise.all(shapeIds.map(async (id) => {
                if (!id) return;
                const res = await axios.get(`http://localhost:8080/api/shapes/${id}`);
                // Convert to [lat, lon] format for Leaflet
                shapeData[id] = res.data.map(p => [p.lat, p.lon]);
            }));

            setShapes(shapeData);
        } catch (error) {
            console.error("Error fetching GTFS data:", error);
        }
    };

    useEffect(() => {
        // Initial fetch
        fetchData();

        // Poll every 5 seconds for updates
        const intervalId = setInterval(fetchData, 5000);

        return () => clearInterval(intervalId);
    }, []);

    // Center map on Purbalingga
    const position = [-7.393, 109.360];

    return (
        <div style={{ height: '80vh', width: '100%' }}>
            <MapContainer center={position} zoom={14} scrollWheelZoom={true} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                {/* Draw Route Lines (Polylines) */}
                {trips.map(trip => {
                    const route = routes.find(r => r.id === trip.route_id);
                    const positions = shapes[trip.shape_id];
                    const color = route ? `#${route.color}` : 'blue';

                    if (!positions || positions.length === 0) return null;

                    return (
                        <Polyline 
                            key={trip.id} 
                            positions={positions} 
                            pathOptions={{ color: color, weight: 5 }} 
                        >
                            <Popup>
                                <strong>{route?.short_name}</strong><br/>
                                {route?.long_name}<br/>
                                Headsign: {trip.headsign}
                            </Popup>
                        </Polyline>
                    );
                })}

                {/* Draw Stops */}
                {stops.map(stop => (
                    <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={busStopIcon}>
                        <Popup>
                            <strong>Bus Stop (Halte)</strong><br/>
                            {stop.name}
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
};

export default MapComponent;