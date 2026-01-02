import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Button, Form, Row, Col, Alert, Modal, Spinner } from 'react-bootstrap';
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

// --- Helper Components ---

const DraggableStopMarker = ({ stop, onDragEnd, onEditClick }) => {
    const markerRef = useRef(null);
    const eventHandlers = useMemo(
        () => ({
            dragend() {
                const marker = markerRef.current;
                if (marker != null) {
                    onDragEnd(stop.id, marker.getLatLng());
                }
            },
        }),
        [stop.id, onDragEnd],
    );

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={[stop.lat, stop.lon]}
            icon={BusStopIcon}
            ref={markerRef}
        >
            <Popup>
                <div className="p-2">
                    <h6 className="mb-1 fw-bold">{stop.name}</h6>
                    <p className="text-muted small mb-3">{stop.lat.toFixed(6)}, {stop.lon.toFixed(6)}</p>
                    <Button size="sm" variant="primary" className="w-100" onClick={() => onEditClick(stop)}>Edit Stop</Button>
                </div>
            </Popup>
        </Marker>
    );
};

const MapEvents = ({ onMapClick }) => {
    useMapEvents({
        click(e) {
            onMapClick(e.latlng);
        },
    });
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

// --- Main Component ---

const Shapes = () => {
    const [routes, setRoutes] = useState([]);
    const [selectedRouteId, setSelectedRouteId] = useState('');
    const [shapeId, setShapeId] = useState('');
    const [points, setPoints] = useState([]);
    const [stops, setStops] = useState([]);
    const [selectedStop, setSelectedStop] = useState(null);
    const [showStopModal, setShowStopModal] = useState(false);
    
    const [message, setMessage] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isRouting, setIsRouting] = useState(false);
    const [showShapePoints, setShowShapePoints] = useState(true);
    const [showStops, setShowStops] = useState(true);
    const [mapCenter, setMapCenter] = useState([-7.393, 109.360]);

    useEffect(() => {
        fetchRoutes();
        fetchStops();
    }, []);

    const fetchRoutes = async () => {
        try {
            const res = await api.get('/routes');
            setRoutes(res.data);
        } catch (error) {
            console.error("Error fetching routes", error);
        }
    };

    const fetchStops = async () => {
        try {
            const res = await api.get('/stops');
            setStops(res.data);
        } catch (error) {
            console.error("Error fetching stops", error);
        }
    };

    const handleRouteChange = async (e) => {
        const routeId = e.target.value;
        setSelectedRouteId(routeId);
        if (!routeId) {
            setShapeId('');
            setPoints([]);
            return;
        }

        try {
            const tripsRes = await api.get('/trips');
            const routeTrips = tripsRes.data.filter(t => t.route_id === parseInt(routeId));
            if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                const sId = routeTrips[0].shape_id;
                setShapeId(sId);
                const shapeRes = await api.get(`/shapes/${sId}`);
                const sorted = shapeRes.data.sort((a, b) => a.sequence - b.sequence);
                setPoints(sorted);
                if (sorted.length > 0) {
                    setMapCenter([sorted[0].lat, sorted[0].lon]);
                }
            } else {
                setShapeId(`SHP_${routeId}`);
                setPoints([]);
            }
        } catch (error) {
            console.error("Error loading route data", error);
        }
    };

    const saveShape = async () => {
        if (!shapeId || points.length === 0) return;
        setIsLoading(true);
        try {
            await api.put(`/shapes/${shapeId}`, points);
            setMessage({ type: 'success', text: 'Route path updated successfully' });
        } catch (error) {
            try {
                 await api.post('/shapes', points);
                 setMessage({ type: 'success', text: 'New route path created' });
            } catch (postError) {
                setMessage({ type: 'danger', text: 'Failed to save path' });
            }
        } finally {
            setIsLoading(false);
        }
    };

    const fetchRouteFromOSRM = async () => {
        if (points.length < 2) return;
        setIsRouting(true);
        const coordinates = points.map(p => `${p.lon},${p.lat}`).join(';');
        const url = `https://router.project-osrm.org/route/v1/driving/${coordinates}?overview=full&geometries=geojson`;
        try {
            const res = await axios.get(url);
            if (res.data.routes && res.data.routes.length > 0) {
                const routeGeometry = res.data.routes[0].geometry.coordinates;
                const newPoints = routeGeometry.map((coord, index) => ({
                    shape_id: shapeId,
                    lat: coord[1],
                    lon: coord[0],
                    sequence: index + 1
                }));
                setPoints(newPoints);
            }
        } catch (error) {
            console.error("OSRM Error:", error);
        } finally {
            setIsRouting(false);
        }
    };

    const handleMapClick = (latlng) => {
        if (!shapeId) return;
        const newPoint = {
            shape_id: shapeId,
            lat: latlng.lat,
            lon: latlng.lng,
            sequence: points.length + 1
        };
        setPoints([...points, newPoint]);
    };

    const handlePointRemove = (e, index) => {
        L.DomEvent.stopPropagation(e);
        const newPoints = points.filter((_, i) => i !== index);
        const resequenced = newPoints.map((p, i) => ({ ...p, sequence: i + 1 }));
        setPoints(resequenced);
    };

    const handleStopDragEnd = async (id, newLatLng) => {
        const stop = stops.find(s => s.id === id);
        if (!stop) return;
        try {
            await api.put(`/stops/${id}`, { ...stop, lat: newLatLng.lat, lon: newLatLng.lng });
            setStops(stops.map(s => s.id === id ? { ...s, lat: newLatLng.lat, lon: newLatLng.lng } : s));
            setMessage({ type: 'success', text: `Moved stop: ${stop.name}` });
        } catch (error) {
            fetchStops();
        }
    };

    const updateStop = async () => {
        if (!selectedStop) return;
        try {
            await api.put(`/stops/${selectedStop.id}`, {
                name: selectedStop.name,
                lat: parseFloat(selectedStop.lat),
                lon: parseFloat(selectedStop.lon)
            });
            setShowStopModal(false);
            fetchStops();
            setMessage({ type: 'success', text: 'Stop updated!' });
        } catch (error) {
            setMessage({ type: 'danger', text: 'Error updating stop' });
        }
    };

    return (
        <Container className="mt-4" fluid>
            <Row className="g-4">
                <Col lg={3}>
                    <div className="hig-card shadow-sm">
                        <h5 className="fw-bold mb-4">Route Studio</h5>
                        
                        <div className="mb-4">
                            <label className="small text-muted text-uppercase fw-bold mb-2">Active Route</label>
                            <Form.Select className="form-control" value={selectedRouteId} onChange={handleRouteChange}>
                                <option value="">Select a Route</option>
                                {routes.map(r => (
                                    <option key={r.id} value={r.id}>{r.short_name} - {r.long_name}</option>
                                ))}
                            </Form.Select>
                        </div>

                        <div className="mb-4">
                            <label className="small text-muted text-uppercase fw-bold mb-2">Internal ID</label>
                            <Form.Control 
                                type="text" 
                                value={shapeId} 
                                onChange={(e) => setShapeId(e.target.value)} 
                                placeholder="e.g. SHAPE_01"
                            />
                        </div>

                        <div className="d-grid gap-3">
                            <Button variant="primary" onClick={saveShape} disabled={points.length === 0 || isLoading}>
                                {isLoading ? <Spinner size="sm" /> : 'Apply Path Changes'}
                            </Button>
                            <Button variant="outline-primary" onClick={fetchRouteFromOSRM} disabled={points.length < 2 || isRouting}>
                                {isRouting ? <Spinner size="sm" /> : 'Road-Snap Path'}
                            </Button>
                            <Button variant="light" className="text-danger" onClick={() => setPoints([])}>
                                Reset Geometry
                            </Button>
                        </div>

                        <hr className="my-4" />
                        
                        <label className="small text-muted text-uppercase fw-bold mb-3 d-block">Layers</label>
                        
                        <div className="segmented-control">
                            <div className={`segmented-item ${showShapePoints ? 'active' : ''}`} onClick={() => setShowShapePoints(true)}>Nodes On</div>
                            <div className={`segmented-item ${!showShapePoints ? 'active' : ''}`} onClick={() => setShowShapePoints(false)}>Nodes Off</div>
                        </div>

                        <div className="segmented-control">
                            <div className={`segmented-item ${showStops ? 'active' : ''}`} onClick={() => setShowStops(true)}>Stops On</div>
                            <div className={`segmented-item ${!showStops ? 'active' : ''}`} onClick={() => setShowStops(false)}>Stops Off</div>
                        </div>
                    </div>
                    
                    {message && <Alert variant={message.type} dismissible onClose={() => setMessage(null)} className="hig-card border-0">{message.text}</Alert>}
                </Col>

                <Col lg={9}>
                    <div className="hig-card p-0 overflow-hidden shadow-sm" style={{ height: '82vh' }}>
                        <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
                            <MapEvents onMapClick={handleMapClick} />
                            <RecenterMap center={mapCenter} />

                            {points.length > 1 && <Polyline positions={points.map(p => [p.lat, p.lon])} color="#007AFF" weight={5} lineCap="round" lineJoin="round" />}
                            
                            {showShapePoints && points.map((p, index) => (
                                <Marker key={`shp-${index}`} position={[p.lat, p.lon]} icon={DefaultIcon} eventHandlers={{ contextmenu: (e) => handlePointRemove(e, index) }}>
                                    <Popup>Sequence: {p.sequence}</Popup>
                                </Marker>
                            ))}

                            {showStops && stops.map(stop => (
                                <DraggableStopMarker key={`st-${stop.id}`} stop={stop} onDragEnd={handleStopDragEnd} onEditClick={(s) => { setSelectedStop(s); setShowStopModal(true); }} />
                            ))}
                        </MapContainer>
                    </div>
                </Col>
            </Row>

            <Modal show={showStopModal} onHide={() => setShowStopModal(false)} centered backdropClassName="hig-backdrop">
                <div className="hig-card m-0" style={{border: 'none'}}>
                    <h5 className="fw-bold mb-4">Update Bus Stop</h5>
                    <Form>
                        <Form.Group className="mb-4">
                            <label className="small text-muted text-uppercase fw-bold mb-2">Stop Label</label>
                            <Form.Control value={selectedStop?.name || ''} onChange={(e) => setSelectedStop({...selectedStop, name: e.target.value})} />
                        </Form.Group>
                        <Row>
                            <Col>
                                <Form.Group className="mb-4">
                                    <label className="small text-muted text-uppercase fw-bold mb-2">Lat</label>
                                    <Form.Control type="number" value={selectedStop?.lat || ''} onChange={(e) => setSelectedStop({...selectedStop, lat: e.target.value})} />
                                </Form.Group>
                            </Col>
                            <Col>
                                <Form.Group className="mb-4">
                                    <label className="small text-muted text-uppercase fw-bold mb-2">Lon</label>
                                    <Form.Control type="number" value={selectedStop?.lon || ''} onChange={(e) => setSelectedStop({...selectedStop, lon: e.target.value})} />
                                </Form.Group>
                            </Col>
                        </Row>
                        <div className="d-flex gap-2">
                            <Button variant="primary" className="flex-grow-1" onClick={updateStop}>Save Stop</Button>
                            <Button variant="light" onClick={() => setShowStopModal(false)}>Cancel</Button>
                        </div>
                    </Form>
                </div>
            </Modal>
        </Container>
    );
};

export default Shapes;