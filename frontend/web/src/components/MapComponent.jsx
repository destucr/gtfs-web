import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, Text, Badge, Group, ActionIcon, Stack, ScrollArea, TextInput, Loader, Box, Button, useMantineColorScheme, Tooltip } from '@mantine/core';
import { Search, MapPin, Bus, Navigation, Info, ChevronRight, Sun, Moon, Target, Locate } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';

// Internal API bridge
const api = axios.create({ baseURL: 'http://localhost:8080/api' });

// --- Assets ---
const busStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
});

// --- Map Logic Components ---

const FitBounds = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 0) {
            const bounds = L.latLngBounds(points);
            map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15, animate: true });
        }
    }, [points, map]);
    return null;
};

const MapComponent = () => {
    const { colorScheme, toggleColorScheme } = useMantineColorScheme();
    const dark = colorScheme === 'dark';

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
                api.get('/stops'), api.get('/routes'), api.get('/trips')
            ]);
            setStops(stopsRes.data || []);
            setRoutes(routesRes.data || []);
            setTrips(tripsRes.data || []);

            const shapeIds = [...new Set((tripsRes.data || []).map(t => t.shape_id))];
            const shapeData = {};
            await Promise.all(shapeIds.map(async (id) => {
                if (!id) return;
                const res = await api.get(`/shapes/${id}`);
                shapeData[id] = (res.data || []).map(p => [p.lat, p.lon]);
            }));
            setShapes(shapeData);
        } catch (e) { console.error(e); } finally { setLoading(false); }
    };

    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, 5000);
        return () => clearInterval(id);
    }, []);

    const filteredRoutes = routes.filter(r => 
        r.short_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.long_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    // Get current shape for selected route
    const activeTrip = trips.find(t => t.route_id === selectedRouteId);
    const activePoints = activeTrip ? shapes[activeTrip.shape_id] : null;

    if (loading && routes.length === 0) {
        return (
            <Box h="100vh" className="flex items-center justify-center bg-gray-50">
                <Stack align="center"><Loader size="xl" variant="bars" /><Text fw={700} c="dimmed">CONNECTING TO TRANSIT GRID...</Text></Stack>
            </Box>
        );
    }

    return (
        <Box pos="relative" h="100vh" w="100%" bg={dark ? '#1A1B1E' : '#F8F9FA'}>
            {/* Control HUD */}
            <Box pos="absolute" top={20} left={20} bottom={20} w={340} style={{ zIndex: 1000, pointerEvents: 'none' }}>
                <Card shadow="xl" radius="lg" padding="lg" h="100%" style={{ 
                    pointerEvents: 'auto', 
                    backdropFilter: 'blur(16px)', 
                    backgroundColor: dark ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.85)',
                    border: dark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.05)'
                }}>
                    <Stack h="100%">
                        <Group justify="space-between">
                            <Stack gap={0}>
                                <Text fw={900} size="xl" style={{ letterSpacing: '-0.5px' }} c={dark ? 'white' : 'black'}>GTFS Viewer</Text>
                                <Text size="xs" c="dimmed" fw={800}>LIVE TERMINAL</Text>
                            </Stack>
                            <Group gap={8}>
                                <ActionIcon variant="light" color="blue" onClick={() => toggleColorScheme()} radius="md">
                                    {dark ? <Sun size={16} /> : <Moon size={16} />}
                                </ActionIcon>
                                <Badge variant="dot" color="green">ONLINE</Badge>
                            </Group>
                        </Group>

                        <TextInput
                            placeholder="Find a line..."
                            leftSection={<Search size={16} />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.currentTarget.value)}
                            radius="md"
                            variant="filled"
                        />

                        <ScrollArea scrollbars="y" flex={1} offsetScrollbars className="pr-2">
                            <Stack gap="xs">
                                {filteredRoutes.map(route => (
                                    <Card 
                                        key={route.id} withBorder padding="sm" radius="md"
                                        style={{ 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            borderColor: selectedRouteId === route.id ? `#${route.color}` : undefined,
                                            backgroundColor: selectedRouteId === route.id ? (dark ? 'rgba(255,255,255,0.05)' : 'white') : (dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                                            transform: selectedRouteId === route.id ? 'scale(1.02)' : 'scale(1)'
                                        }}
                                        onClick={() => setSelectedRouteId(selectedRouteId === route.id ? null : route.id)}
                                    >
                                        <Group wrap="nowrap">
                                            <Box w={36} h={36} bg={`#${route.color}`} style={{ borderRadius: '8px', display: 'flex', color: 'white' }}>
                                                <Bus size={18} style={{ margin: 'auto' }} />
                                            </Box>
                                            <Box flex={1}>
                                                <Text fw={800} size="sm">{route.short_name}</Text>
                                                <Text size="xs" c="dimmed" truncate>{route.long_name}</Text>
                                            </Box>
                                            {selectedRouteId === route.id && <Target size={14} className="text-blue-500 animate-pulse" />}
                                        </Group>
                                    </Card>
                                ))}
                            </Stack>
                        </ScrollArea>

                        <Group gap="xs" pt="md" style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : '#eee'}` }}>
                            <Badge color="blue" variant="light" radius="sm" leftSection={<MapPin size={10} />}>{stops.length} STOPS</Badge>
                            <Badge color="orange" variant="light" radius="sm" leftSection={<Navigation size={10} />}>{routes.length} LINES</Badge>
                        </Group>
                    </Stack>
                </Card>
            </Box>

            {/* Quick Actions HUD */}
            <Box pos="absolute" top={20} right={20} style={{ zIndex: 1000 }}>
                <Stack gap="xs">
                    <Tooltip label="My Location" position="left">
                        <ActionIcon size="xl" radius="lg" variant="white" shadow="md" color="blue">
                            <Locate size={20} />
                        </ActionIcon>
                    </Tooltip>
                </Stack>
            </Box>

            <MapContainer center={[-7.393, 109.360]} zoom={14} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url={dark 
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    }
                    attribution='&copy; CARTO'
                />
                
                {selectedRouteId && activePoints && <FitBounds points={activePoints} />}

                {trips.map(trip => {
                    const route = routes.find(r => r.id === trip.route_id);
                    const positions = shapes[trip.shape_id];
                    if (!positions || positions.length === 0) return null;
                    const isSelected = selectedRouteId === null || selectedRouteId === trip.route_id;

                    return (
                        <Polyline 
                            key={trip.id} positions={positions} 
                            pathOptions={{ 
                                color: `#${route?.color || '007AFF'}`, 
                                weight: isSelected ? 6 : 2,
                                opacity: isSelected ? 0.9 : 0.15,
                                lineCap: 'round', lineJoin: 'round'
                            }} 
                        >
                            <Popup>
                                <Stack gap={4}>
                                    <Text fw={800} size="sm" c="blue">{route?.short_name}</Text>
                                    <Text fw={600} size="xs">{route?.long_name}</Text>
                                    <Text size="xs" c="dimmed">Destination: {trip.headsign}</Text>
                                </Stack>
                            </Popup>
                        </Polyline>
                    );
                })}

                {stops.map(stop => (
                    <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={busStopIcon}>
                        <Popup>
                            <Stack gap={4} p={4}>
                                <Group gap={6}>
                                    <Box w={8} h={8} bg="blue" style={{ borderRadius: '50%' }} />
                                    <Text fw={800} size="sm">{stop.name}</Text>
                                </Group>
                                <Text size="xs" c="dimmed" fw={600}>BUS STOP (HALTE)</Text>
                                <Button size="xs" fullWidth variant="light" mt={8}>Transit Schedule</Button>
                            </Stack>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </Box>
    );
};

export default MapComponent;