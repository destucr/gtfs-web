import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, useMap, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Search, Sun, Moon, Target, Locate, X, Loader2 } from 'lucide-react';
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
import { Stop, Route, Trip, ShapePoint, TripStop } from '../types';
import { RouteSign } from './RouteSign';
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

const MapEvents: React.FC<{ onMapClick: () => void }> = ({ onMapClick }) => {
    useMapEvents({
        click: () => onMapClick()
    });
    return null;
};

const MapComponent: React.FC = () => {
    const [stops, setStops] = useState<Stop[]>([]);
    const [routes, setRoutes] = useState<Route[]>([]);
    const [trips, setTrips] = useState<Trip[]>([]);
    const [shapes, setShapes] = useState<Record<string, [number, number][]>>({});
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedRouteId, setSelectedRouteId] = useState<number | null>(null);
    const [selectedStop, setSelectedStop] = useState<Stop | null>(null);
    const [selectedStopSchedule, setSelectedStopSchedule] = useState<TripStop[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState<string | null>(null);
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [loading, setLoading] = useState(true);
    const [systemStatus, setSystemStatus] = useState<'online' | 'offline'>('online');

    const fetchStopSchedule = async (stopId: number) => {
        setScheduleLoading(true);
        setScheduleError(null);
        try {
            const res = await api.get(`/stops/${stopId}/times`);
            // Sort by arrival time
            const sorted = (res.data || []).sort((a: TripStop, b: TripStop) => a.arrival_time.localeCompare(b.arrival_time));
            setSelectedStopSchedule(sorted);
        } catch (e) {
            console.error('Failed to fetch stop schedule', e);
            setScheduleError('Schedule unavailable');
        } finally {
            setScheduleLoading(false);
        }
    };

    useEffect(() => {
        if (selectedStop) {
            fetchStopSchedule(selectedStop.id);
        } else {
            setSelectedStopSchedule([]);
            setScheduleError(null);
        }
    }, [selectedStop]);

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
            setSystemStatus('online');
        } catch (e) {
            console.error('Fetch failed', e);
            setSystemStatus('offline');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(fetchData, 5000);
        return () => clearInterval(interval);
    }, []);

    // Clear stop selection if the route filter changes and excludes it
    useEffect(() => {
        if (selectedStop && selectedRouteId) {
            if (!selectedStop.route_ids?.includes(selectedRouteId)) {
                setSelectedStop(null);
            }
        }
    }, [selectedRouteId, selectedStop]);

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
                <Stack gap={0} bg={isDarkMode ? '#18181b' : '#000'} py={16} px={16}>
                    <Group justify="space-between" align="start">
                        <Stack gap={4}>
                            <Text fw={900} size="24px" c="white" style={{ letterSpacing: '-0.5px', lineHeight: 1 }}>
                                TRANSIT<br />MAP
                            </Text>
                            <Badge
                                color={systemStatus === 'online' ? "yellow" : "red"}
                                size="sm"
                                radius="xs"
                                variant="filled"
                                styles={{ root: { color: 'black', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' } }}
                            >
                                {systemStatus === 'online' ? "System Online" : "Offline"}
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
                <Box px={16} py={12} style={{ borderBottom: `1px solid ${isDarkMode ? '#27272a' : '#eee'}` }}>
                    <TextInput
                        placeholder="Find a route or stop..."
                        leftSection={<Search size={14} strokeWidth={3} />}
                        radius="xs"
                        size="sm"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        styles={{
                            input: {
                                backgroundColor: isDarkMode ? '#27272a' : '#f4f4f4',
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
                        Available Routes
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
                                        backgroundColor: isSelected ? (isDarkMode ? '#27272a' : '#f8f9fa') : 'transparent',
                                        borderBottom: `1px solid ${isDarkMode ? '#27272a' : '#f0f0f0'}`,
                                        transition: 'background-color 0.1s ease'
                                    }}
                                >
                                    <Group justify="space-between" wrap="nowrap">
                                        <Group wrap="nowrap" gap="md">
                                            <RouteSign route={route} size="md" />
                                            {/* Text Info */}
                                            <Stack gap={0}>
                                                <Text fw={700} size="14px" c={isDarkMode ? 'white' : 'black'} style={{ lineHeight: 1.2 }}>
                                                    {route.long_name}
                                                </Text>
                                                <Text size="11px" fw={500} c="dimmed" mt={2}>
                                                    {isSelected ? 'Showing Route' : 'Select to view'}
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
                    bg={isDarkMode ? '#18181b' : '#f8f9fa'}
                    style={{ borderTop: `1px solid ${isDarkMode ? '#27272a' : '#ddd'}` }}
                >
                    <Group justify="space-between" align="center" mb={4}>
                        <Text size="11px" fw={800} c="dimmed" tt="uppercase" style={{ letterSpacing: '0.5px' }}>
                            Status
                        </Text>
                        <Group gap={6}>
                            <Box w={8} h={8} style={{ borderRadius: '50%', backgroundColor: systemStatus === 'online' ? '#40c057' : '#fa5252' }} />
                            <Text size="11px" fw={700} c={systemStatus === 'online' ? 'green' : 'red'}>
                                {systemStatus === 'online' ? "GOOD" : "OFFLINE"}
                            </Text>
                        </Group>
                    </Group>
                    <Text size="12px" fw={500} c={isDarkMode ? 'gray.3' : 'gray.7'} style={{ lineHeight: 1.4 }}>
                        {loading ? 'Updating feeds...' : (
                            systemStatus === 'online'
                                ? `Live updates active. ${routes.length} routes available.`
                                : `Connection failed. Retrying...`
                        )}
                    </Text>
                </Box>
            </Paper>

            <MapContainer
                center={[-7.393, 109.360] as [number, number]}
                zoom={14}
                zoomControl={false}
                style={{ height: '100%', marginLeft: '360px', width: 'calc(100% - 360px)' }} // Offset for sidebar
            >
                <MapController focusedPoints={selectedStop ? [[selectedStop.lat, selectedStop.lon]] : activeShape} />
                <MapEvents onMapClick={() => setSelectedStop(null)} />
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
                    <Marker
                        key={stop.id}
                        position={[stop.lat, stop.lon]}
                        icon={selectedStop?.id === stop.id ? L.divIcon({
                            className: 'custom-bus-stop-selected',
                            html: `<div style="
                                width: 16px; 
                                height: 16px; 
                                background: #FF9500; 
                                border: 3px solid white; 
                                border-radius: 50%; 
                                box-shadow: 0 0 0 4px rgba(255,149,0,0.3);
                            "></div>`,
                            iconSize: [16, 16],
                            iconAnchor: [8, 8]
                        }) : busStopIcon}
                        eventHandlers={{
                            click: () => setSelectedStop(stop)
                        }}
                    />
                ))}
            </MapContainer>

            {/* Station Hub - Proximal Hub Overlay Pattern */}
            {selectedStop && (
                <Paper
                    pos="absolute" top={20} right={20}
                    style={{
                        zIndex: 1000,
                        width: 320,
                        borderRadius: '12px',
                        boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)',
                        backgroundColor: isDarkMode ? '#18181b' : '#fff',
                        border: `1px solid ${isDarkMode ? '#27272a' : '#eee'}`,
                        overflow: 'hidden'
                    }}
                >
                    <Stack gap={0}>
                        <Box p={16} bg={isDarkMode ? '#27272a' : '#f8f9fa'} style={{ borderBottom: `1px solid ${isDarkMode ? '#333' : '#eee'}` }}>
                            <Group justify="space-between" align="start" wrap="nowrap">
                                <Stack gap={2}>
                                    <Text fw={900} size="16px" c={isDarkMode ? 'white' : 'black'} style={{ lineHeight: 1.2, letterSpacing: '-0.5px' }}>
                                        {selectedStop.name.toUpperCase()}
                                    </Text>
                                    <Text size="10px" fw={800} c="dimmed" tt="uppercase" style={{ letterSpacing: '1px' }}>
                                        Bus Stop
                                    </Text>
                                </Stack>
                                <ActionIcon
                                    variant="subtle"
                                    color="gray"
                                    onClick={() => setSelectedStop(null)}
                                    size="sm"
                                    aria-label="Close station details"
                                >
                                    <X size={16} />
                                </ActionIcon>
                            </Group>
                        </Box>

                        <Box p={16}>
                            <Text size="11px" fw={700} c="dimmed" tt="uppercase" mb={10} style={{ letterSpacing: '0.5px' }}>
                                Serving Lines
                            </Text>
                            <Group gap={6} wrap="wrap">
                                {selectedStop.route_ids && selectedStop.route_ids.length > 0 ? (
                                    selectedStop.route_ids.map(rId => {
                                        const route = routes.find(r => r.id === rId);
                                        if (!route) return null;
                                        return <RouteSign key={rId} route={route} size="sm" />;
                                    })
                                ) : (
                                    <Text size="11px" c="dimmed" fw={600} style={{ fontStyle: 'italic' }}>No buses at this time</Text>
                                )}
                            </Group>

                            <Divider my={16} color={isDarkMode ? '#27272a' : '#eee'} />

                            <Text size="11px" fw={700} c="dimmed" tt="uppercase" mb={10} style={{ letterSpacing: '0.5px' }}>
                                Daily Schedule
                            </Text>
                            <Stack gap={4}>
                                {scheduleLoading ? (
                                    <Group gap={6}>
                                        <Loader2 size={12} className="animate-spin text-zinc-400" />
                                        <Text size="10px" fw={600} c="dimmed">Fetching times...</Text>
                                    </Group>
                                ) : scheduleError ? (
                                    <Text size="10px" fw={600} c="red.6">{scheduleError}</Text>
                                ) : selectedStopSchedule.length > 0 ? (
                                    selectedStopSchedule.map((item, i) => {
                                        const route = routes.find(r => r.id === item.trip?.route_id);
                                        return (
                                            <Paper key={i} p={8} bg={isDarkMode ? 'rgba(255,255,255,0.03)' : '#fcfcfc'} withBorder style={{ borderColor: isDarkMode ? '#27272a' : '#eee' }}>
                                                <Group justify="space-between" wrap="nowrap">
                                                    <Group gap={8} wrap="nowrap">
                                                        <Box w={4} h={16} style={{ backgroundColor: `#${route?.color || 'ddd'}`, borderRadius: 2 }} />
                                                        <Stack gap={0}>
                                                            <Text size="10px" fw={900} truncate>{route?.short_name || '??'} &mdash; {item.trip?.headsign || 'Unnamed'}</Text>
                                                            <Text size="9px" fw={700} c="dimmed">SEQ #{item.sequence}</Text>
                                                        </Stack>
                                                    </Group>
                                                    <Stack gap={0} align="end">
                                                        <Text size="10px" fw={900} c="system-blue">ARR {item.arrival_time.slice(0, 5)}</Text>
                                                        <Text size="9px" fw={700} c="dimmed">DEP {item.departure_time.slice(0, 5)}</Text>
                                                    </Stack>
                                                </Group>
                                            </Paper>
                                        );
                                    })
                                ) : (
                                    <Text size="10px" fw={600} c="dimmed" style={{ fontStyle: 'italic' }}>No upcoming arrivals scheduled.</Text>
                                )}
                            </Stack>

                            <Divider my={16} color={isDarkMode ? '#27272a' : '#eee'} />

                            <Group justify="space-between">
                                <Stack gap={0}>
                                    <Text size="10px" fw={800} c="dimmed" tt="uppercase">Location</Text>
                                    <Text size="11px" fw={600} c={isDarkMode ? 'gray.4' : 'gray.7'} style={{ fontFamily: 'monospace' }}>
                                        {selectedStop.lat.toFixed(6)}, {selectedStop.lon.toFixed(6)}
                                    </Text>
                                </Stack>
                                <Target size={16} className={isDarkMode ? 'text-zinc-600' : 'text-zinc-300'} />
                            </Group>
                        </Box>
                    </Stack>
                </Paper>
            )}

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
