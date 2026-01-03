import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { Search, Sun, Moon, Target, Locate, Info as InfoIcon } from 'lucide-react';
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

    const filteredStops = useMemo(() => {
        if (!selectedRouteId) return stops;
        return stops.filter(stop => stop.route_ids?.includes(selectedRouteId));
    }, [selectedRouteId, stops]);

    return (
        <Box h="100vh" w="100vw" pos="relative" style={{ overflow: 'hidden' }}>
            {/* Immersive Sidebar - Swiss Transport Style */}
            <Paper
                pos="absolute" top={0} left={0}
                style={{
                    zIndex: 1000,
                    width: 360, // Fixed 360px width
                    borderRadius: '0px',
                    boxShadow: '4px 0 16px rgba(0,0,0,0.1)',
                    backgroundColor: isDarkMode ? '#111' : '#fff',
                    borderRight: `1px solid ${isDarkMode ? '#333' : '#ddd'}`,
                    height: '100vh',
                    display: 'flex',
                    flexDirection: 'column'
                }}
            >
                {/* 1. Header Area: Masthead Style */}
                <Stack gap={0} bg={isDarkMode ? '#000' : '#000'} py={16} px={16}>
                    <Group justify="space-between" align="start">
                        <Stack gap={4}>
                            <Text fw={900} size="24px" c="white" style={{ letterSpacing: '-0.5px', lineHeight: 1 }}>
                                GTFS<br />TERMINAL
                            </Text>
                            <Badge
                                color="yellow"
                                size="sm"
                                radius="xs"
                                variant="filled"
                                styles={{ root: { color: 'black', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' } }}
                            >
                                Network Live
                            </Badge>
                        </Stack>
                        <ActionIcon
                            size="lg" radius="xs" variant="transparent" color="white"
                            onClick={() => setIsDarkMode(!isDarkMode)}
                            style={{ border: '1px solid #333' }}
                        >
                            {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
                        </ActionIcon>
                    </Group>
                </Stack>

                {/* 2. Integrated Search */}
                <Box px={16} py={12} style={{ borderBottom: `1px solid ${isDarkMode ? '#333' : '#eee'}` }}>
                    <TextInput
                        placeholder="SEARCH ROUTE / STATION"
                        leftSection={<Search size={14} strokeWidth={3} />}
                        radius="xs"
                        size="sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        styles={{
                            input: {
                                backgroundColor: isDarkMode ? '#222' : '#f4f4f4',
                                border: 'none',
                                fontWeight: 600,
                                fontSize: '12px',
                                letterSpacing: '0.5px'
                            }
                        }}
                    />
                </Box>

                {/* 3. Route List: Table-Row Style */}
                <Box px={16} py={12} pb={4}>
                    <Text size="11px" fw={700} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                        Active Corridors
                    </Text>
                </Box>

                <ScrollArea scrollbars="y" style={{ flex: 1 }}>
                    <Stack gap={0}>
                        {filteredRoutes.map(route => {
                            const isSelected = selectedRouteId === route.id;
                            return (
                                <UnstyledButton
                                    key={route.id}
                                    onClick={() => setSelectedRouteId(isSelected ? null : route.id)}
                                    py={12}
                                    px={16}
                                    style={{
                                        backgroundColor: isSelected ? (isDarkMode ? '#222' : '#f8f9fa') : 'transparent',
                                        borderBottom: `1px solid ${isDarkMode ? '#222' : '#f0f0f0'}`,
                                        transition: 'background-color 0.1s ease'
                                    }}
                                >
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group wrap="nowrap" gap="md">
                                            {/* Badge: Swiss Pill Style */}
                                            <Box
                                                style={{
                                                    minWidth: 42, height: 24,
                                                    borderRadius: '12px',
                                                    backgroundColor: `#${route.color}`,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    color: 'white', fontWeight: 700, fontSize: '11px',
                                                    padding: '0 8px'
                                                }}
                                            >
                                                {route.short_name}
                                            </Box>
                                            {/* Text Info */}
                                            <Stack gap={0}>
                                                <Text fw={700} size="14px" c={isDarkMode ? 'white' : 'black'} style={{ lineHeight: 1.2 }}>
                                                    {route.long_name}
                                                </Text>
                                                <Text size="11px" fw={500} c="dimmed" mt={2}>
                                                    {isSelected ? 'Viewing Route' : 'Normal Service'}
                                                </Text>
                                            </Stack>
                                        </Group>
                                        {isSelected && <Target size={16} strokeWidth={3} />}
                                    </Group>
                                </UnstyledButton>
                            )
                        })}
                    </Stack>
                </ScrollArea>

                {/* 4. Pinned Status Footer */}
                <Box
                    p={16}
                    bg={isDarkMode ? '#1a1a1a' : '#f8f9fa'}
                    style={{ borderTop: `1px solid ${isDarkMode ? '#333' : '#ddd'}` }}
                >
                    <Group justify="space-between" align="center" mb={4}>
                        <Text size="11px" fw={800} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                            System Status
                        </Text>
                        <Group gap={6}>
                            <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: '#40c057' }} />
                            <Text size="11px" fw={700} c="green">GOOD</Text>
                        </Group>
                    </Group>
                    <Text size="12px" fw={500} c={isDarkMode ? 'gray.3' : 'gray.7'} style={{ lineHeight: 1.4 }}>
                        {loading ? 'Updating feeds...' : `System Online. ${routes.length} Lines Active. ${trips.length} Trips Scheduled.`}
                    </Text>
                </Box>
            </Paper>

            <MapContainer
                center={[-7.393, 109.360] as [number, number]}
                zoom={14}
                zoomControl={false}
                style={{ height: '100%', marginLeft: '360px', width: 'calc(100% - 360px)' }} // Offset for sidebar
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

                {filteredStops.map(stop => (
                    <Marker key={stop.id} position={[stop.lat, stop.lon]} icon={busStopIcon}>
                        <Popup minWidth={240}>
                            <Stack gap={4} p={4}>
                                <Group justify="space-between">
                                    <Text fw={900} size="sm">{stop.name.toUpperCase()}</Text>
                                    <InfoIcon size={14} />
                                </Group>
                                <Text size="xs" c="dimmed" fw={800} mt={-4}>NETWORK STATION POINT</Text>
                                <Divider my={4} />

                                {/* Route Badges via Hydration */}
                                <Group gap={4} wrap="wrap" mb={4}>
                                    {stop.route_ids && stop.route_ids.length > 0 ? (
                                        stop.route_ids.map(rId => {
                                            const route = routes.find(r => r.id === rId);
                                            if (!route) return null;
                                            return (
                                                <Box
                                                    key={rId}
                                                    px={6} py={2}
                                                    style={{
                                                        backgroundColor: `#${route.color}`,
                                                        borderRadius: '4px',
                                                        color: 'white',
                                                        fontSize: '10px',
                                                        fontWeight: 800
                                                    }}
                                                >
                                                    {route.short_name}
                                                </Box>
                                            );
                                        })
                                    ) : (
                                        <Text size="10px" c="dimmed" fw={600} style={{ fontStyle: 'italic' }}>No active service</Text>
                                    )}
                                </Group>

                                <Group gap="xs" mt={2}>
                                    <Text size="10px" c="dimmed" fw={600}>
                                        {stop.lat.toFixed(5)}, {stop.lon.toFixed(5)}
                                    </Text>
                                </Group>
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
        </Box >
    );
};

export default MapComponent;
