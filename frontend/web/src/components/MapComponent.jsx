import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, Text, Badge, Group, ActionIcon, Stack, ScrollArea, TextInput, Loader, Box, Button, useMantineColorScheme, Tooltip, ActionIcon as MActionIcon } from '@mantine/core';
import { Search, MapPin, Bus, Navigation, Info, Sun, Moon, Target, Locate, Info as InfoIcon, Clock, Radio } from 'lucide-react';
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
            map.fitBounds(bounds, { padding: [100, 100], maxZoom: 15, animate: true });
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
    const [lastSync, setLastSync] = useState(new Date());

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
            setLastSync(new Date());
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

    const activeTrip = trips.find(t => t.route_id === selectedRouteId);
    const activePoints = activeTrip ? shapes[activeTrip.shape_id] : null;

    if (loading && routes.length === 0) {
        return (
            <Box h="100vh" className="flex items-center justify-center bg-slate-50">
                <Stack align="center" gap="md">
                    <Loader size="xl" variant="dots" color="blue" />
                    <Text fw={800} size="xl" c="blue" style={{ letterSpacing: '2px' }}>INITIALIZING TRANSIT NETWORK</Text>
                    <Text size="xs" c="dimmed" fw={700}>ESTABLISHING DATA SYNC...</Text>
                </Stack>
            </Box>
        );
    }

    return (
        <Box pos="relative" h="100vh" w="100%" bg={dark ? '#141517' : '#F8F9FA'}>
            {/* Sidebar HUD */}
            <Box pos="absolute" top={20} left={20} bottom={20} w={360} style={{ zIndex: 1000, pointerEvents: 'none' }}>
                <Card shadow="2xl" radius="lg" padding="xl" h="100%" style={{ 
                    pointerEvents: 'auto', 
                    backdropFilter: 'blur(20px)', 
                    backgroundColor: dark ? 'rgba(20, 21, 23, 0.85)' : 'rgba(255, 255, 255, 0.9)',
                    border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <Stack gap="xl" h="100%">
                        {/* Header */}
                        <Group justify="space-between" align="start">
                            <Stack gap={2}>
                                <Text fw={900} size="24px" style={{ letterSpacing: '-1px', lineHeight: 1 }} c={dark ? 'white' : 'black'}>Transit Live</Text>
                                <Text size="10px" c="blue" fw={800} style={{ letterSpacing: '1px' }}>PURBALINGGA FLEET TERMINAL</Text>
                            </Stack>
                            <Tooltip label={dark ? "Switch to Day Mode" : "Switch to Night Mode"} position="bottom" withArrow>
                                <ActionIcon 
                                    variant="light" 
                                    color="blue" 
                                    onClick={() => toggleColorScheme()} 
                                    radius="md" 
                                    size="lg"
                                >
                                    {dark ? <Sun size={18} /> : <Moon size={18} />}
                                </ActionIcon>
                            </Tooltip>
                        </Group>

                        {/* Search */}
                        <TextInput
                            placeholder="Find a route or destination..."
                            leftSection={<Search size={16} strokeWidth={3} />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.currentTarget.value)}
                            radius="md"
                            size="md"
                            variant="filled"
                            styles={{ input: { fontWeight: 600 } }}
                        />

                        {/* List Area */}
                        <ScrollArea scrollbars="y" flex={1} offsetScrollbars className="pr-2">
                            <Stack gap="xs">
                                {selectedRouteId === null && searchQuery === '' && (
                                    <Box py="xl" px="md" style={{ border: '2px dashed rgba(0,0,0,0.05)', borderRadius: '12px' }}>
                                        <Stack align="center" gap={8} className="text-center">
                                            <InfoIcon size={24} className="text-blue-400" />
                                            <Text fw={800} size="sm">Welcome to the Explorer</Text>
                                            <Text size="xs" c="dimmed" fw={600} style={{ lineHeight: 1.4 }}>
                                                Select a service line below to visualize its geographic path and station sequence.
                                            </Text>
                                        </Stack>
                                    </Box>
                                )}

                                {filteredRoutes.map(route => (
                                    <Card 
                                        key={route.id} withBorder padding="sm" radius="md"
                                        style={{ 
                                            cursor: 'pointer',
                                            transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                                            borderColor: selectedRouteId === route.id ? `#${route.color}` : undefined,
                                            backgroundColor: selectedRouteId === route.id ? (dark ? 'rgba(255,255,255,0.05)' : 'white') : (dark ? 'rgba(255,255,255,0.02)' : 'rgba(0,0,0,0.02)'),
                                            transform: selectedRouteId === route.id ? 'scale(1.02)' : 'scale(1)',
                                            boxShadow: selectedRouteId === route.id ? '0 10px 20px rgba(0,0,0,0.1)' : 'none'
                                        }}
                                        onClick={() => setSelectedRouteId(selectedRouteId === route.id ? null : route.id)}
                                    >
                                        <Group wrap="nowrap" gap="md">
                                            <Box w={42} h={42} bg={`#${route.color}`} style={{ borderRadius: '10px', display: 'flex', color: 'white', flexShrink: 0, boxShadow: `0 4px 12px #${route.color}40` }}>
                                                <Bus size={20} strokeWidth={3} style={{ margin: 'auto' }} />
                                            </Box>
                                            <Box flex={1} style={{ minWidth: 0 }}>
                                                <Text fw={900} size="sm" tracking="tight">{route.short_name}</Text>
                                                <Text size="11px" c="dimmed" truncate fw={700}>{route.long_name.toUpperCase()}</Text>
                                            </Box>
                                            {selectedRouteId === route.id && <Target size={16} className="text-blue-500 animate-pulse" />}
                                        </Group>
                                    </Card>
                                ))}
                            </Stack>
                        </ScrollArea>

                        {/* Footer Stats */}
                        <Stack gap="xs" pt="md" style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}` }}>
                            <Group justify="space-between">
                                <Group gap={6}>
                                    <Badge color="blue" variant="light" radius="sm" leftSection={<MapPin size={10} strokeWidth={3} />}>{stops.length} STATIONS</Badge>
                                    <Badge color="orange" variant="light" radius="sm" leftSection={<Navigation size={10} strokeWidth={3} />}>{routes.length} LINES</Badge>
                                </Group>
                                <Tooltip label="Live Data Frequency: 5s" position="top">
                                    <Group gap={4} opacity={0.6}>
                                        <Radio size={10} className="text-green-500 fill-green-500 animate-ping" />
                                        <Text size="9px" fw={900}>LIVE SYNC</Text>
                                    </Group>
                                </Tooltip>
                            </Group>
                            <Group gap={4} opacity={0.4}>
                                <Clock size={10} />
                                <Text size="9px" fw={800}>LAST UPDATED: {lastSync.toLocaleTimeString()}</Text>
                            </Group>
                        </Stack>
                    </Stack>
                </Card>
            </Box>

            {/* Quick Map Actions */}
            <Box pos="absolute" top={20} right={20} style={{ zIndex: 1000 }}>
                <Tooltip label="Center Map on Network" position="left" withArrow>
                    <MActionIcon size={50} radius="xl" variant="white" shadow="xl" color="blue" style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                        <Locate size={24} strokeWidth={2.5} />
                    </MActionIcon>
                </Tooltip>
            </Box>

            {/* Hint Overlay */}
            {!selectedRouteId && (
                <Box pos="absolute" bottom={40} left="50%" style={{ zIndex: 1000, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
                    <Badge size="xl" radius="xl" variant="white" shadow="xl" p="md" leftSection={<InfoIcon size={14}/>} style={{ border: '1px solid rgba(0,0,0,0.05)' }}>
                        <Text fw={800} size="xs" c="blue">TIP: CLICK ANY ROUTE TO VIEW DETAILED PATH</Text>
                    </Badge>
                </Box>
            )}

            <MapContainer center={[-7.393, 109.360]} zoom={14} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <TileLayer
                    url={dark 
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    }
                    attribution='&copy; CARTO'
                />
                
                {selectedRouteId && activePoints && <FitBounds points={activePoints} />}

                {/* Draw Network Fleet */}
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
                                weight: isSelected ? 7 : 3,
                                opacity: isSelected ? 0.9 : 0.1,
                                lineCap: 'round', lineJoin: 'round'
                            }} 
                        >
                            <Popup>
                                <Stack gap={2} p={4}>
                                    <Text fw={900} size="md" c="blue" style={{ letterSpacing: '-0.5px' }}>{route?.short_name} &mdash; {route?.long_name}</Text>
                                    <Group gap={6}>
                                        <Badge variant="dot" color="blue" size="xs">ACTIVE LINE</Badge>
                                        <Text size="xs" fw={700} c="dimmed">TARGET: {trip.headsign.toUpperCase()}</Text>
                                    </Group>
                                </Stack>
                            </Popup>
                        </Polyline>
                    );
                })}

                {/* Draw Station Points */}
                {stops.map(stop => (
                    <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={busStopIcon}>
                        <Popup>
                            <Stack gap={4} p={4} minW={200}>
                                <Group gap="xs" wrap="nowrap">
                                    <Box w={10} h={10} bg="blue" style={{ borderRadius: '50%', flexShrink: 0 }} className="animate-pulse" />
                                    <Text fw={900} size="sm" tracking="tight">{stop.name.toUpperCase()}</Text>
                                </Group>
                                <Text size="10px" c="dimmed" fw={800} tracking="1px" mt={-4}>NETWORK STATION POINT</Text>
                                <Button size="xs" fullWidth variant="light" mt={8} radius="md" fw={800} leftSection={<Clock size={10}/>}>
                                    ARRIVALS & SCHEDULE
                                </Button>
                            </Stack>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>
        </Box>
    );
};

export default MapComponent;
