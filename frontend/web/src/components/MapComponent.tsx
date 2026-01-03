import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import { Card, Text, Badge, Group, ActionIcon, Stack, ScrollArea, TextInput, Loader, Box, Button, useMantineColorScheme, Tooltip } from '@mantine/core';
import { Search, MapPin, Bus, Navigation, Sun, Moon, Target, Locate, Info as InfoIcon, Clock, Radio } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';
import { Route, Stop, Trip, ShapePoint } from '../types';

// Internal API bridge
const api = axios.create({ baseURL: 'http://localhost:8080/api' });

// --- Assets ---
const busStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [32, 32], iconAnchor: [16, 32], popupAnchor: [0, -32]
});

// --- Map Logic Components ---

const FitBounds: React.FC<{ points: [number, number][] }> = ({ points }) => {
    const map = useMap();
    useEffect(() => {
        if (points && points.length > 0) {
            const bounds = L.latLngBounds(points);
            // Account for sidebar (400px left) and bottom cards (100px bottom)
            map.fitBounds(bounds, { 
                paddingTopLeft: [420, 40], 
                paddingBottomRight: [40, 120], 
                maxZoom: 15, 
                animate: true 
            });
        }
    }, [points, map]);
    return null;
};

const RecenterControl: React.FC<{ center: [number, number], zoom: number }> = ({ center, zoom }) => {
    const map = useMap();
    return (
        <Box pos="absolute" top={20} right={20} style={{ zIndex: 1000 }}>
            <Tooltip label="Recenter Network" position="left" withArrow>
                <ActionIcon 
                    size={44} radius="md" variant="white" shadow="md" color="blue" 
                    style={{ border: '1px solid rgba(0,0,0,0.1)', backgroundColor: 'white' }} 
                    onClick={() => map.setView(center, zoom)}
                >
                    <Locate size={20} strokeWidth={2} />
                </ActionIcon>
            </Tooltip>
        </Box>
    );
};

const MapComponent: React.FC = () => {
    const { colorScheme, toggleColorScheme } = useMantineColorScheme();
    const dark = colorScheme === 'dark';

    const [routes, setRoutes] = useState<Route[]>([]);
    const [stops, setStops] = useState<Stop[]>([]);
    const [shapes, setShapes] = useState<Record<string, [number, number][]>>({});
    const [trips, setTrips] = useState<Trip[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
    const [lastSync, setLastSync] = useState(new Date());

    const fetchData = async () => {
        try {
            const [stopsRes, routesRes, tripsRes] = await Promise.all([
                api.get('/stops'), api.get('/routes'), api.get('/trips')
            ]);
            setStops(stopsRes.data || []);
            setRoutes(routesRes.data || []);
            setTrips(tripsRes.data || []);

            const shapeIds = [...new Set((tripsRes.data || []).map((t: Trip) => t.shape_id))];
            const shapeData: Record<string, [number, number][]> = {};
            await Promise.all(shapeIds.map(async (id) => {
                if (!id) return;
                const res = await api.get(`/shapes/${id}`);
                const points: ShapePoint[] = res.data || [];
                shapeData[id] = points.map(p => [p.lat, p.lon] as [number, number]);
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
            <Box h="100vh" className="flex items-center justify-center" bg={dark ? '#141517' : '#F8F9FA'}>
                <Stack align="center" gap="xl">
                    <Loader size="xl" variant="bars" color="blue" />
                    <Stack gap={4} align="center">
                        <Text fw={700} size="xl" c={dark ? 'white' : 'blue.9'}>Initializing Network</Text>
                        <Text size="sm" c="dimmed" fw={500}>System is synchronizing with GTFS real-time feeds...</Text>
                    </Stack>
                </Stack>
            </Box>
        );
    }

    return (
        <Box pos="relative" h="100vh" w="100%" bg={dark ? '#141517' : '#F8F9FA'}>
            {/* Sidebar Navigation */}
            <Box pos="absolute" top={20} left={20} bottom={20} w={380} style={{ zIndex: 1000, pointerEvents: 'none' }}>
                <Card shadow="xl" radius="md" padding="lg" h="100%" style={{ 
                    pointerEvents: 'auto', 
                    backdropFilter: 'blur(16px)', 
                    backgroundColor: dark ? 'rgba(26, 27, 30, 0.9)' : 'rgba(255, 255, 255, 0.92)',
                    border: `1px solid ${dark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.08)'}`,
                    display: 'flex',
                    flexDirection: 'column'
                }}>
                    <Stack gap="lg" h="100%">
                        <Group justify="space-between" align="center">
                            <Stack gap={0}>
                                <Text fw={800} size="22px" style={{ letterSpacing: '-0.5px' }} c={dark ? 'white' : 'blue.9'}>Transit Explorer</Text>
                                <Text size="10px" c="dimmed" fw={700} style={{ letterSpacing: '0.5px' }}>PURBALINGGA FLEET TERMINAL</Text>
                            </Stack>
                            <ActionIcon 
                                variant="subtle" 
                                color="gray" 
                                onClick={() => toggleColorScheme()} 
                                radius="md" 
                                size="lg"
                            >
                                {dark ? <Sun size={18} /> : <Moon size={18} />}
                            </ActionIcon>
                        </Group>

                        <TextInput
                            placeholder="Search routes or stations..."
                            leftSection={<Search size={16} />}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.currentTarget.value)}
                            radius="md"
                            variant="filled"
                            styles={(theme) => ({
                                input: { 
                                    backgroundColor: dark ? theme.colors.dark[6] : theme.colors.gray[1],
                                    fontWeight: 500 
                                }
                            })}
                        />

                        <ScrollArea scrollbars="y" flex={1} offsetScrollbars>
                            <Stack gap="xs" pr="md">
                                {selectedRouteId === null && searchQuery === '' && (
                                    <Box py="xl" px="md" style={{ border: `1px dashed ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)'}`, borderRadius: '12px' }}>
                                        <Stack align="center" gap={12} className="text-center">
                                            <InfoIcon size={20} color="#228be6" />
                                            <Box>
                                                <Text fw={600} size="sm">Ready to explore?</Text>
                                                <Text size="xs" c="dimmed" mt={4} style={{ lineHeight: 1.5 }}>
                                                    Select a service line below to visualize its journey. The map will automatically focus on the route path and highlight all station stops.
                                                </Text>
                                            </Box>
                                        </Stack>
                                    </Box>
                                )}

                                {filteredRoutes.map(route => (
                                    <Card 
                                        key={route.id} withBorder padding="sm" radius="md"
                                        style={{ 
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            borderColor: selectedRouteId === route.id ? `#${route.color}` : undefined,
                                            backgroundColor: selectedRouteId === route.id ? (dark ? 'rgba(34, 139, 230, 0.1)' : 'rgba(34, 139, 230, 0.05)') : undefined,
                                            borderWidth: selectedRouteId === route.id ? '2px' : '1px'
                                        }}
                                        onClick={() => setSelectedRouteId(selectedRouteId === route.id ? null : route.id)}
                                    >
                                        <Group wrap="nowrap" gap="md">
                                            <Box w={40} h={40} bg={`#${route.color}`} style={{ borderRadius: '8px', display: 'flex', color: 'white', flexShrink: 0 }}>
                                                <Bus size={18} strokeWidth={2.5} style={{ margin: 'auto' }} />
                                            </Box>
                                            <Box flex={1} style={{ minWidth: 0 }}>
                                                <Text fw={700} size="sm" truncate>{route.short_name}</Text>
                                                <Text size="11px" c="dimmed" truncate fw={500}>{route.long_name}</Text>
                                            </Box>
                                            {selectedRouteId === route.id && <Target size={14} color={`#${route.color}`} />}
                                        </Group>
                                    </Card>
                                ))}
                            </Stack>
                        </ScrollArea>

                        <Stack gap="sm" pt="md" style={{ borderTop: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)'}` }}>
                            <Group justify="space-between">
                                <Group gap={6}>
                                    <Badge color="blue" variant="light" size="sm" radius="sm">{stops.length} STATIONS</Badge>
                                    <Badge color="gray" variant="light" size="sm" radius="sm">{routes.length} ROUTES</Badge>
                                </Group>
                                <Group gap={4}>
                                    <Box w={8} h={8} bg="green" style={{ borderRadius: '50%' }} className="animate-pulse" />
                                    <Text size="10px" fw={700} c="dimmed">LIVE SYNC</Text>
                                </Group>
                            </Group>
                            <Group gap={4} opacity={0.6}>
                                <Clock size={12} />
                                <Text size="10px" fw={500}>System updated: {lastSync.toLocaleTimeString()}</Text>
                            </Group>
                        </Stack>
                    </Stack>
                </Card>
            </Box>

            {!selectedRouteId && (
                <Box pos="absolute" bottom={30} left="50%" style={{ zIndex: 1000, transform: 'translateX(-50%)', pointerEvents: 'none' }}>
                    <Card shadow="md" radius="xl" py={6} px={16} withBorder style={{ backgroundColor: 'rgba(255,255,255,0.95)', border: '1px solid rgba(34, 139, 230, 0.2)' }}>
                        <Group gap={8}>
                            <InfoIcon size={14} color="#228be6" />
                            <Text fw={600} size="xs" c="blue.7">Tip: Select a route below to see its path on the map</Text>
                        </Group>
                    </Card>
                </Box>
            )}

            {selectedRouteId && (
                <Box pos="absolute" bottom={30} right={30} style={{ zIndex: 1000 }}>
                    <Card shadow="lg" radius="md" padding="md" withBorder style={{ 
                        backdropFilter: 'blur(8px)',
                        backgroundColor: dark ? 'rgba(26, 27, 30, 0.8)' : 'rgba(255, 255, 255, 0.9)',
                        border: `1px solid ${dark ? 'rgba(255,255,255,0.1)' : 'rgba(34, 139, 230, 0.3)'}`
                    }}>
                        <Stack gap={4}>
                            <Text size="10px" fw={700} c="dimmed" style={{ letterSpacing: '0.5px' }}>NOW VIEWING</Text>
                            <Text fw={700} size="sm">
                                {routes.find(r => r.id === selectedRouteId)?.long_name}
                            </Text>
                            <Button variant="light" size="compact-xs" color="red" mt={4} onClick={() => setSelectedRouteId(null)} radius="sm">
                                Clear Selection
                            </Button>
                        </Stack>
                    </Card>
                </Box>
            )}

            <MapContainer center={[-7.393, 109.360]} zoom={14} zoomControl={false} style={{ height: '100%', width: '100%' }}>
                <RecenterControl center={[-7.393, 109.360]} zoom={14} />
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