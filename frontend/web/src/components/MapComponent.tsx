import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Bus, Sun, Moon, Target, Locate, Info as InfoIcon, Clock } from 'lucide-react';
import {
    Box,
    Paper,
    TextInput,
    Stack,
    Text,
    ActionIcon,
    ScrollArea,
    Group,
    Badge,
    UnstyledButton,
    Transition,
    ThemeIcon,
    Divider
} from '@mantine/core';
import api from '../api';
import { Stop, Route, Trip, ShapePoint } from '../types';
import 'leaflet/dist/leaflet.css';

const busStopIcon = L.divIcon({
    className: 'custom-bus-stop',
    html: `<div style="
        width: 12px; 
        height: 12px; 
        background: #FF9500; 
        border: 2px solid white; 
        border-radius: 50%; 
        box-shadow: 0 2px 4px rgba(0,0,0,0.3);
    "></div>`,
    iconSize: [12, 12],
    iconAnchor: [6, 6]
});

const MapController: React.FC<{ focusedPoints: [number, number][] | null }> = ({ focusedPoints }) => {
    const map = useMap();
    useEffect(() => {
        if (focusedPoints && focusedPoints.length > 0) {
            const bounds = L.latLngBounds(focusedPoints);
            map.flyToBounds(bounds, { padding: [50, 50], duration: 0.5 });
        }
    }, [focusedPoints, map]);
    return null;
};

const MapComponent: React.FC = () => {
    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [shapes, setShapes] = useState<Record<string, [number, number][]>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);

    const fetchData = async () => {
        try {
            const [sRes, rRes, tRes] = await Promise.all([
                api.get('/stops'),
                api.get('/routes'),
                api.get('/trips')
            ]);
            setStops(sRes.data || []);
            setRoutes(rRes.data || []);
            setTrips(tRes.data || []);

            const shapeData: Record<string, [number, number][]> = {};
            await Promise.all((tRes.data || []).map(async (trip: Trip) => {
                if (trip.shape_id && !shapeData[trip.shape_id]) {
                    const res = await api.get(`/shapes/${trip.shape_id}`);
                    const points: ShapePoint[] = res.data || [];
                    shapeData[trip.shape_id] = points.sort((a, b) => a.sequence - b.sequence).map(p => [p.lat, p.lon] as [number, number]);
                }
            }));
            setShapes(shapeData);
        } catch (e) {
            console.error('Fetch failed', e);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    const filteredRoutes = routes.filter(r =>
        r.long_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        r.short_name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const activeShape = useMemo(() => {
        if (!selectedRouteId) return null;
        const trip = trips.find(t => t.route_id === selectedRouteId);
        return (trip && trip.shape_id) ? shapes[trip.shape_id] : null;
    }, [selectedRouteId, trips, shapes]);

    return (
        <Box h="100vh" w="100vw" pos="relative" style={{ overflow: 'hidden' }}>
            {/* Immersive Sidebar */}
            <Paper
                pos="absolute" top={20} left={20}
                style={{
                    zIndex: 1000,
                    width: 340,
                    borderRadius: '24px',
                    boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
                    backdropFilter: 'blur(20px)',
                    backgroundColor: isDarkMode ? 'rgba(26, 27, 30, 0.85)' : 'rgba(255, 255, 255, 0.85)',
                    border: `1px solid ${isDarkMode ? '#373A40' : '#e9ecef'}`,
                    height: 'calc(100vh - 40px)',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                <Stack p="lg" gap="md" style={{ flex: 1, overflow: 'hidden' }}>
                    <Group justify="space-between">
                        <Stack gap={0}>
                            <Text fw={900} size="xl" c="blue.6">GTFS TERMINAL</Text>
                            <Text size="xs" fw={800} c="dimmed">LIVE NETWORK FEED</Text>
                        </Stack>
                        <ActionIcon
                            size="lg" radius="md" variant="light"
                            onClick={() => setIsDarkMode(!isDarkMode)}
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </ActionIcon>
                    </Group>

                    <TextInput
                        placeholder="Search routes..."
                        leftSection={<Search size={16} />}
                        radius="md" size="md"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        styles={{ input: { backgroundColor: isDarkMode ? '#25262b' : '#f8f9fa' } }}
                    />

                    <Divider label="Service Lines" labelPosition="center" />

                    <ScrollArea scrollbars="y" style={{ flex: 1 }}>
                        <Stack gap="xs">
                            {filteredRoutes.map(route => (
                                <UnstyledButton
                                    key={route.id}
                                    onClick={() => setSelectedRouteId(selectedRouteId === route.id ? null : route.id)}
                                    p="md"
                                    style={{
                                        borderRadius: '12px',
                                        backgroundColor: selectedRouteId === route.id ? (isDarkMode ? '#2c2e33' : '#f1f3f5') : 'transparent',
                                        border: `1px solid ${selectedRouteId === route.id ? (isDarkMode ? '#373A40' : '#dee2e6') : 'transparent'}`,
                                        transition: 'all 0.2s ease'
                                    }}
                                >
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group wrap="nowrap">
                                            <ThemeIcon
                                                size={40} radius="md"
                                                style={{ backgroundColor: `#${route.color}` }}
                                            >
                                                <Bus size={20} color="white" />
                                            </ThemeIcon>
                                            <Stack gap={0}>
                                                <Text fw={800} size="sm">{route.long_name}</Text>
                                                <Text size="xs" c="dimmed" fw={700}>CORIDOR {route.short_name}</Text>
                                            </Stack>
                                        </Group>
                                        <Transition mounted={selectedRouteId === route.id} transition="slide-left">
                                            {(styles) => <Target style={styles} size={16} color="#228be6" />}
                                        </Transition>
                                    </Group>
                                </UnstyledButton>
                            ))}
                        </Stack>
                    </ScrollArea>

                    <Paper p="md" radius="lg" bg={isDarkMode ? 'dark.6' : 'blue.0'}>
                        <Group justify="space-between">
                            <Stack gap={0}>
                                <Text size="xs" fw={800} c="blue.9">SYSTEM STATUS</Text>
                                <Text size="sm" fw={900} c="blue.7">{loading ? 'SYNCING...' : 'OPERATIONAL'}</Text>
                            </Stack>
                            <Badge variant="dot" color="green" size="lg">LIVE</Badge>
                        </Group>
                    </Paper>
                </Stack>
            </Paper>

            <MapContainer
                center={[-7.393, 109.360] as [number, number]}
                zoom={14}
                zoomControl={false}
                style={{ height: '100%', width: '100%' }}
            >
                <MapController focusedPoints={activeShape} />
                <TileLayer
                    url={isDarkMode
                        ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                        : "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                    }
                    attribution='&copy; CARTO'
                />

                {trips.map(trip => {
                    if (!trip.shape_id || !shapes[trip.shape_id]) return null;
                    const route = routes.find(r => r.id === trip.route_id);
                    const isSelected = selectedRouteId === trip.route_id;
                    return (
                        <Polyline
                            key={trip.id}
                            positions={shapes[trip.shape_id]}
                            pathOptions={{
                                color: (selectedRouteId === null || isSelected) ? `#${route?.color || '007AFF'}` : (isDarkMode ? '#444' : '#ccc'),
                                weight: isSelected ? 6 : (selectedRouteId === null ? 4 : 3),
                                opacity: (selectedRouteId === null || isSelected) ? (isDarkMode ? 0.8 : 0.8) : 0.3,
                                lineCap: 'round',
                                lineJoin: 'round'
                            }}
                        />
                    );
                })}

                {stops.map(stop => (
                    <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={busStopIcon}>
                        <Popup minWidth={240}>
                            <Stack gap={4} p={4}>
                                <Group justify="space-between">
                                    <Text fw={900} size="sm">{stop.name.toUpperCase()}</Text>
                                    <InfoIcon size={14} />
                                </Group>
                                <Text size="xs" c="dimmed" fw={800} mt={-4}>NETWORK STATION POINT</Text>
                                <Divider my={4} />
                                <Group gap="xs">
                                    <ThemeIcon size="xs" variant="light" color="orange"><Clock size={10} /></ThemeIcon>
                                    <Text size="xs" fw={700}>ARRIVALS EVERY 15 MIN</Text>
                                </Group>
                                <UnstyledButton mt={4}>
                                    <Group gap={4}>
                                        <Locate size={12} color="#228be6" />
                                        <Text size="xs" fw={900} c="blue.6">GET DIRECTIONS</Text>
                                    </Group>
                                </UnstyledButton>
                            </Stack>
                        </Popup>
                    </Marker>
                ))}
            </MapContainer>

            <Box pos="absolute" bottom={30} right={20} style={{ zIndex: 1000 }}>
                <Stack gap="xs">
                    <ActionIcon
                        size={44} radius="md" variant="white" color="blue"
                        onClick={() => window.location.reload()}
                        style={{ border: '1px solid #e9ecef', backgroundColor: 'white' }}
                    >
                        <Locate size={20} />
                    </ActionIcon>
                </Stack>
            </Box>
        </Box>
    );
};

export default MapComponent;
