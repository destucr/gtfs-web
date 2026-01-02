import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Button, Form, Row, Col, Alert, Table, Card, Spinner, ListGroup, Badge } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';

// --- Icons ---
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

const DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

const BusStopIcon = L.icon({
    iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
});

// --- Map Helpers ---

const MapEvents = ({ onMapClick }) => {
    useMapEvents({ click(e) { onMapClick(e.latlng); } });
    return null;
};

const RecenterMap = ({ center }) => {
    const map = useMap();
    useEffect(() => {
        if (center && center[0] && center[1]) {
            map.setView(center, map.getZoom());
        }
    }, [center, map]);
    return null;
};

const RouteStudio = () => {
    // Data States
    const [routes, setRoutes] = useState([]);
    const [agencies, setAgencies] = useState([]);
    const [allStops, setAllStops] = useState([]);
    
    // Selection States
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [shapePoints, setShapePoints] = useState([]);
    const [assignedStops, setAssignedStops] = useState([]); // [{id, stop_id, sequence, stop: {}}]
    
    // UI States
    const [isLoading, setIsLoading] = useState(false);
    const [isRouting, setIsRouting] = useState(false);
    const [message, setMessage] = useState(null);
    const [mapCenter, setMapCenter] = useState([-7.393, 109.360]);
    const [activeTab, setActiveTab] = useState('metadata'); // metadata, shape, stops

    const [globalLoading, setGlobalLoading] = useState(true);

    useEffect(() => {
        refreshAll();
    }, []);

    const refreshAll = async () => {
        setGlobalLoading(true);
        try {
            const [rRes, aRes, sRes] = await Promise.all([
                api.get('/routes'),
                api.get('/agencies'),
                api.get('/stops')
            ]);
            setRoutes(rRes.data || []);
            setAgencies(aRes.data || []);
            setAllStops(sRes.data || []);
        } catch (e) {
            console.error("Refresh failed", e);
        } finally {
            setGlobalLoading(false);
        }
    };

    if (globalLoading) {
        return (
            <Container className="mt-5 text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-2 text-muted">Loading Studio...</p>
            </Container>
        );
    }

    const handleSelectRoute = async (route) => {
        setSelectedRoute(route);
        setMessage(null);
        setActiveTab('metadata');
        
        // Load Shape & Assigned Stops
        try {
            const [tripsRes, stopsRes] = await Promise.all([
                api.get('/trips'),
                api.get(`/routes/${route.id}/stops`)
            ]);
            
            setAssignedStops(stopsRes.data);
            
            const trip = tripsRes.data.find(t => t.route_id === route.id);
            if (trip && trip.shape_id) {
                const shapeRes = await api.get(`/shapes/${trip.shape_id}`);
                const sorted = shapeRes.data.sort((a, b) => a.sequence - b.sequence);
                setShapePoints(sorted);
                if (sorted.length > 0) setMapCenter([sorted[0].lat, sorted[0].lon]);
            } else {
                setShapePoints([]);
            }
        } catch (e) { console.error(e); }
    };

    // --- Actions: Metadata ---
    const handleSaveMetadata = async () => {
        try {
            await api.put(`/routes/${selectedRoute.id}`, selectedRoute);
            setMessage({ type: 'success', text: 'Route details updated' });
            refreshAll();
        } catch (e) { setMessage({ type: 'danger', text: 'Update failed' }); }
    };

    // --- Actions: Shape ---
    const handleSnapToRoads = async () => {
        if (shapePoints.length < 2) return;
        setIsRouting(true);
        const coords = shapePoints.map(p => `${p.lon},${p.lat}`).join(';');
        try {
            const res = await axios.get(`https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`);
            const geo = res.data.routes[0].geometry.coordinates;
            const newPts = geo.map((c, i) => ({
                shape_id: `SHP_${selectedRoute.id}`,
                lat: c[1], lon: c[0], sequence: i + 1
            }));
            setShapePoints(newPts);
        } catch (e) { console.error(e); } finally { setIsRouting(false); }
    };

    const handleSaveShape = async () => {
        const sId = selectedRoute.short_name ? `SHP_${selectedRoute.short_name.toUpperCase()}` : `SHP_${selectedRoute.id}`;
        try {
            await api.put(`/shapes/${sId}`, shapePoints.map(p => ({ ...p, shape_id: sId })));
            // Ensure a trip exists for this route/shape
            const trips = await api.get('/trips');
            if (!trips.data.find(t => t.route_id === selectedRoute.id)) {
                await api.post('/trips', { 
                    route_id: selectedRoute.id, 
                    headsign: selectedRoute.long_name, 
                    shape_id: sId 
                });
            } else {
                // Update existing trip shape_id if it differs
                const trip = trips.data.find(t => t.route_id === selectedRoute.id);
                if (trip.shape_id !== sId) {
                    await api.put(`/trips/${trip.id}`, { ...trip, shape_id: sId });
                }
            }
            setMessage({ type: 'success', text: `Path saved as ${sId}` });
        } catch (e) { setMessage({ type: 'danger', text: 'Save failed' }); }
    };

    // --- Actions: Assigned Stops ---
    const addStopToRoute = (stop) => {
        const newRS = {
            route_id: selectedRoute.id,
            stop_id: stop.id,
            stop: stop,
            sequence: assignedStops.length + 1
        };
        setAssignedStops([...assignedStops, newRS]);
    };

    const removeStopFromRoute = (index) => {
        const filtered = assignedStops.filter((_, i) => i !== index);
        setAssignedStops(filtered.map((s, i) => ({ ...s, sequence: i + 1 })));
    };

    const saveRouteStops = async () => {
        try {
            await api.put(`/routes/${selectedRoute.id}/stops`, assignedStops);
            setMessage({ type: 'success', text: 'Stop sequence updated' });
        } catch (e) { setMessage({ type: 'danger', text: 'Failed to update stops' }); }
    };

    return (
        <Container fluid className="mt-4">
            <Row className="g-4">
                {/* Sidebar: Route List */}
                <Col lg={3}>
                    <div className="hig-card shadow-sm mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h5 className="fw-bold m-0">Route Studio</h5>
                            <Button variant="primary" size="sm" pill onClick={() => setSelectedRoute({short_name: '', long_name: '', color: '007AFF', agency_id: agencies[0]?.id})}>+ New</Button>
                        </div>
                        <ListGroup variant="flush" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
                            {routes.map(r => (
                                <ListGroup.Item 
                                    key={r.id} 
                                    action 
                                    active={selectedRoute?.id === r.id}
                                    onClick={() => handleSelectRoute(r)}
                                    className="d-flex align-items-center"
                                >
                                    <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: `#${r.color}`, marginRight: '12px' }}></div>
                                    <div>
                                        <div className="fw-bold">{r.short_name}</div>
                                        <div className="small text-muted">{r.long_name}</div>
                                    </div>
                                </ListGroup.Item>
                            ))}
                        </ListGroup>
                    </div>
                </Col>

                {/* Main Content: Unified Editor */}
                <Col lg={9}>
                    {!selectedRoute ? (
                        <div className="hig-card d-flex flex-column align-items-center justify-content-center text-center shadow-sm" style={{ height: '80vh' }}>
                            <img src="https://cdn-icons-png.flaticon.com/512/854/854878.png" width="120" className="mb-4 opacity-50" />
                            <h4 className="fw-bold">Welcome to Route Studio</h4>
                            <p className="text-muted">Select a route from the sidebar to edit its information, path, and stops.</p>
                        </div>
                    ) : (
                        <div>
                            {/* Segmented Control for Tabs */}
                            <div className="segmented-control mb-4" style={{ maxWidth: '400px' }}>
                                <div className={`segmented-item ${activeTab === 'metadata' ? 'active' : ''}`} onClick={() => setActiveTab('metadata')}>Info</div>
                                <div className={`segmented-item ${activeTab === 'shape' ? 'active' : ''}`} onClick={() => setActiveTab('shape')}>Path (Shape)</div>
                                <div className={`segmented-item ${activeTab === 'stops' ? 'active' : ''}`} onClick={() => setActiveTab('stops')}>Stops Assignment</div>
                            </div>

                            <Row className="g-4">
                                <Col lg={4}>
                                    <div className="hig-card shadow-sm">
                                        {activeTab === 'metadata' && (
                                            <div>
                                                <h6 className="text-muted text-uppercase fw-bold small mb-3">Metadata</h6>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Short Name</Form.Label>
                                                    <Form.Control value={selectedRoute.short_name} onChange={e => setSelectedRoute({...selectedRoute, short_name: e.target.value})} />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Long Name</Form.Label>
                                                    <Form.Control value={selectedRoute.long_name} onChange={e => setSelectedRoute({...selectedRoute, long_name: e.target.value})} />
                                                </Form.Group>
                                                <Form.Group className="mb-3">
                                                    <Form.Label className="small fw-bold">Color (HEX)</Form.Label>
                                                    <div className="d-flex gap-2">
                                                        <Form.Control value={selectedRoute.color} onChange={e => setSelectedRoute({...selectedRoute, color: e.target.value})} />
                                                        <div style={{ width: '40px', height: '40px', borderRadius: '8px', backgroundColor: `#${selectedRoute.color}`, border: '1px solid #ddd' }}></div>
                                                    </div>
                                                </Form.Group>
                                                <Button variant="primary" className="w-100" onClick={handleSaveMetadata}>Save Info</Button>
                                            </div>
                                        )}

                                        {activeTab === 'shape' && (
                                            <div>
                                                <h6 className="text-muted text-uppercase fw-bold small mb-3">Path Geometry</h6>
                                                <div className="d-grid gap-2">
                                                    <Button variant="outline-primary" onClick={handleSnapToRoads} disabled={shapePoints.length < 2 || isRouting}>
                                                        {isRouting ? <Spinner size="sm" /> : 'Snap to Roads'}
                                                    </Button>
                                                    <Button variant="primary" onClick={handleSaveShape} disabled={shapePoints.length === 0}>Save Path</Button>
                                                    <Button variant="light" className="text-danger" onClick={() => setShapePoints([])}>Clear Path</Button>
                                                </div>
                                                <div className="mt-3 small text-muted">
                                                    Click the map to add nodes. Use Snap to Roads to align the path with real street geometry.
                                                </div>
                                            </div>
                                        )}

                                        {activeTab === 'stops' && (
                                            <div>
                                                <h6 className="text-muted text-uppercase fw-bold small mb-3">Assigned Stops</h6>
                                                <ListGroup className="mb-3 shadow-sm">
                                                    {assignedStops.map((rs, i) => (
                                                        <ListGroup.Item key={i} className="d-flex justify-content-between align-items-center">
                                                            <div className="small fw-bold">{i+1}. {rs.stop?.name}</div>
                                                            <Button variant="link" size="sm" className="text-danger p-0" onClick={() => removeStopFromRoute(i)}>×</Button>
                                                        </ListGroup.Item>
                                                    ))}
                                                    {assignedStops.length === 0 && <div className="p-3 text-muted small text-center">No stops assigned.</div>}
                                                </ListGroup>
                                                <Button variant="primary" className="w-100 mb-4" onClick={saveRouteStops}>Update Sequence</Button>

                                                <h6 className="text-muted text-uppercase fw-bold small mb-2">Inventory Picker</h6>
                                                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                                    {allStops.filter(s => !assignedStops.find(rs => rs.stop_id === s.id)).map(s => (
                                                        <div key={s.id} className="d-flex justify-content-between align-items-center p-2 border-bottom">
                                                            <span className="small">{s.name}</span>
                                                            <Button variant="outline-primary" size="sm" onClick={() => addStopToRoute(s)}>+</Button>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        
                                        {message && <Alert variant={message.type} className="mt-3 border-0 shadow-sm">{message.text}</Alert>}
                                    </div>
                                </Col>

                                <Col lg={8}>
                                    <div className="hig-card p-0 overflow-hidden shadow-sm" style={{ height: '70vh' }}>
                                        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
                                            <RecenterMap center={mapCenter} />
                                            {activeTab === 'shape' && <MapEvents onMapClick={latlng => setShapePoints([...shapePoints, {lat: latlng.lat, lon: latlng.lng, sequence: shapePoints.length+1}])} />}

                                            {/* Line */}
                                            {shapePoints.length > 1 && <Polyline positions={shapePoints.map(p => [p.lat, p.lon])} color={`#${selectedRoute.color}`} weight={5} />}
                                            
                                            {/* Shape Points (only in shape tab) */}
                                            {activeTab === 'shape' && shapePoints.map((p, i) => (
                                                <Marker key={`shp-${i}`} position={[p.lat, p.lon]} icon={DefaultIcon} eventHandlers={{ contextmenu: () => setShapePoints(shapePoints.filter((_, idx) => idx !== i).map((pt, ix) => ({...pt, sequence: ix+1}))) }} />
                                            ))}

                                            {/* Assigned Stops */}
                                            {assignedStops.map((rs, i) => (
                                                <Marker key={`rs-${i}`} position={[rs.stop.lat, rs.stop.lon]} icon={BusStopIcon}>
                                                    <Popup>
                                                        <strong>Stop #{i+1}</strong><br/>{rs.stop.name}
                                                    </Popup>
                                                </Marker>
                                            ))}
                                        </MapContainer>
                                    </div>
                                </Col>
                            </Row>
                        </div>
                    )}
                </Col>
            </Row>
        </Container>
    );
};

export default RouteStudio;