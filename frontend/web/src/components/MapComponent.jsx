import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Search, MapPin, Bus, Navigation, Info, ChevronRight } from 'lucide-react';
import { Card, Text, Badge, Group, ActionIcon, Stack, ScrollArea, TextInput, Loader, Box, Button } from '@mantine/core';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';

// --- Icons ---
const busStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center) map.setView(center, map.getZoom());
    }, [center, map]);
    return null;
};

const MapComponent = () => {
    const [routes, setRoutes] = useState([]);
    const [stops, setStops] = useState([]);
    const [shapes, setShapes] = useState({});
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRouteId, setSelectedRouteId] = useState(null);

    const fetchData = async () => {
        try {
            const [stopsRes, routesRes, tripsRes] = await Promise.all([
                axios.get('http://localhost:8080/api/stops'),
                axios.get('http://localhost:8080/api/routes'),
                axios.get('http://localhost:8080/api/trips')
            ]);

            setStops(stopsRes.data || []);
            setRoutes(routesRes.data || []);
            setTrips(tripsRes.data || []);

            const shapeIds = [...new Set((tripsRes.data || []).map(t => t.shape_id))];
            const shapeData = {};

            await Promise.all(shapeIds.map(async (id) => {
                if (!id) return;
                const res = await axios.get(`http://localhost:8080/api/shapes/${id}`);
                shapeData[id] = (res.data || []).map(p => [p.lat, p.lon]);
            }));

            setShapes(shapeData);
        } catch (error) {
            console.error("Error fetching GTFS data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const intervalId = setInterval(fetchData, 5000);
        return () => clearInterval(intervalId);
    }, []);

    const filteredRoutes = routes.filter(r => 
        r.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.long_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const center = [-7.393, 109.360];

    if (loading && routes.length === 0) {
        return (
            <Box h="100vh" className="flex items-center justify-center">
                <Stack align="center">
                    <Loader size="xl" />
                    <Text fw={500} c="dimmed">Initializing Map Terminal...</Text>
                </Stack>
            </Box>
        );
    }

    return (
        <Box pos="relative" h="100vh" w="100%">
            {/* Sidebar Overlay */}
            <Box 
                pos="absolute" 
                top={20} 
                left={20} 
                bottom={20} 
                w={340} 
                style={{ zIndex: 1000, pointerEvents: 'none' }}
            >
                <Card 
                    shadow="xl" 
                    radius="lg" 
                    padding="lg" 
                    h="100%" 
                    style={{ pointerEvents: 'auto', backdropFilter: 'blur(10px)', backgroundColor: 'rgba(255,255,255,0.9)' }}
                >
                    <Stack h="100%">
                        <Group justify="space-between">
                            <Stack gap={0}>
                                <Text fw={800} size="xl" style={{ letterSpacing: '-0.5px' }}>GTFS Viewer</Text>
                                <Text size="xs" c="dimmed" fw={700}>PURBALINGGA TERMINAL</Text>
                            </Stack>
                            <Badge variant="dot" color="green">Live</Badge>
                        </Group>

                        <TextInput
                            placeholder="Search routes..."
                            leftSection={<Search size={16} />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.currentTarget.value)}
                            radius="md"
                        />

                        <ScrollArea scrollbars="y" flex={1} offsetScrollbars>
                            <Stack gap="xs">
                                {filteredRoutes.map(route => (
                                    <Card 
                                        key={route.id} 
                                        withBorder 
                                        padding="sm" 
                                        radius="md"
                                        style={{ 
                                            cursor: 'pointer',
                                            borderColor: selectedRouteId === route.id ? `rgba(${hexToRgb(route.color)}, 0.5)` : undefined,
                                            backgroundColor: selectedRouteId === route.id ? `rgba(${hexToRgb(route.color)}, 0.05)` : undefined
                                        }}
                                        onClick={() => setSelectedRouteId(selectedRouteId === route.id ? null : route.id)}
                                    >
                                        <Group wrap="nowrap">
                                            <Box 
                                                w={40} 
                                                h={40} 
                                                bg={`#${route.color}`} 
                                                style={{ borderRadius: '8px', display: 'flex', alignItems: 'center', justifyCenter: 'center', color: 'white' }}
                                            >
                                                <Bus size={20} style={{ margin: 'auto' }} />
                                            </Box>
                                            <Box flex={1}>
                                                <Text fw={700} size="sm">{route.short_name}</Text>
                                                <Text size="xs" c="dimmed" truncate>{route.long_name}</Text>
                                            </Box>
                                            <ActionIcon variant="light" color="gray" radius="xl">
                                                <ChevronRight size={14} />
                                            </ActionIcon>
                                        </Group>
                                    </Card>
                                ))}
                            </Stack>
                        </ScrollArea>

                        <Box pt="md" style={{ borderTop: '1px solid #eee' }}>
                            <Group gap="xs">
                                <Badge color="blue" variant="light" leftSection={<MapPin size={10} />}>{stops.length} Stops</Badge>
                                <Badge color="orange" variant="light" leftSection={<Navigation size={10} />}>{routes.length} Lines</Badge>
                            </Group>
                        </Box>
                    </Stack>
                </Card>
            </Box>

            {/* Map Container */}
            <MapContainer 
                center={center} 
                zoom={14} 
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* Route Lines */}
                {trips.map(trip => {
                    const route = routes.find(r => r.id === trip.route_id);
                    const positions = shapes[trip.shape_id];
                    if (!positions || positions.length === 0) return null;
                    
                    // If a route is selected, fade others
                    const isSelected = selectedRouteId === null || selectedRouteId === trip.route_id;

                    return (
                        <Polyline 
                            key={trip.id} 
                            positions={positions} 
                            pathOptions={{ 
                                color: `#${route?.color || '007AFF'}`, 
                                weight: isSelected ? 6 : 2,
                                opacity: isSelected ? 0.8 : 0.2
                            }} 
                        >
                            <Popup>
                                <Stack gap={4}>
                                    <Text fw={700} size="sm">{route?.short_name} - {route?.long_name}</Text>
                                    <Text size="xs" c="dimmed">Destination: {trip.headsign}</Text>
                                </Stack>
                            </Popup>
                        </Polyline>
                    );
                })}

                {/* Markers */}
                {stops.map(stop => (
                    <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={busStopIcon}>
                        <Popup>
                            <Stack gap={4} p={4}>
                                <Group gap={6}>
                                    <Box w={8} h={8} bg="blue" style={{ borderRadius: '50%' }} />
                                    <Text fw={700} size="sm">{stop.name}</Text>
                                </Group>
                                <Text size="xs" c="dimmed">Bus Stop (Halte)</Text>
                                <Button size="xs" variant="light" mt={4} leftSection={<Info size={10} />}>View Schedules</Button>
                            </Stack>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </Box>
    );
};

// Helper to convert hex to rgb for rgba backgrounds
function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? 
        `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}` 
        : '0, 122, 255';
}

export default MapComponent;
