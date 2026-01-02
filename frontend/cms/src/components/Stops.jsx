import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Container, Table, Button, Form, Row, Col, Card, Badge, Spinner, Modal, ListGroup } from 'react-bootstrap';
import { MapContainer, TileLayer, Marker, Polyline, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../api';
import axios from 'axios';
import L from 'leaflet';

// Fix Leaflet icons
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// --- Components ---

const LocationPicker = ({ onLocationSelect }) => {
    useMapEvents({ click(e) { onLocationSelect(e.latlng); } });
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

// Draggable marker for the active form selection
const EditMarker = ({ position, onDragEnd }) => {
    const markerRef = useRef(null);
    const eventHandlers = useMemo(() => ({
        dragend() {
            const marker = markerRef.current;
            if (marker != null) onDragEnd(marker.getLatLng());
        },
    }), [onDragEnd]);

    return (
        <Marker
            draggable={true}
            eventHandlers={eventHandlers}
            position={position}
            ref={markerRef}
        />
    );
};

const Stops = () => {
    const [stops, setStops] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [stopRouteMap, setStopRouteMap] = useState({});
    
    // Form State
    const [formData, setFormData] = useState({ name: '', lat: '', lon: '' });
    const [editingId, setEditingId] = useState(null);
    
    // UI State
    const [loading, setLoading] = useState(true);
    const [isNaming, setIsNaming] = useState(false);
    const [mapCenter, setMapCenter] = useState([-7.393, 109.360]);
    const [selectedRouteIds, setSelectedRouteIds] = useState([]);
    const [routeShapes, setRouteShapes] = useState({});
    const [assignmentModal, setAssignmentModal] = useState({ show: false, stop: null, routeIds: [] });
    const [inlineEdit, setInlineEdit] = useState(null);

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        setLoading(true);
        try {
            const [sRes, rRes, srRes] = await Promise.all([
                api.get('/stops'), 
                api.get('/routes'),
                api.get('/stop-routes')
            ]);
            
            const stopsData = sRes.data || [];
            const routesData = rRes.data || [];
            const associations = srRes.data || [];

            setStops(stopsData);
            setRoutes(routesData);
            
            const map = {};
            associations.forEach(assoc => {
                if (!map[assoc.stop_id]) map[assoc.stop_id] = [];
                const r = routesData.find(rt => rt.id === assoc.route_id);
                if (r) map[assoc.stop_id].push(r);
            });
            setStopRouteMap(map);
        } catch (e) { 
            console.error("Data fetch failed", e); 
        } finally {
            setLoading(false);
        }
    };

    const handleMapClick = async (latlng) => {
        setFormData(prev => ({ ...prev, lat: latlng.lat, lon: latlng.lng }));
        if (!editingId) { // Only auto-name for NEW stops
            setIsNaming(true);
            try {
                const res = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latlng.lat}&lon=${latlng.lng}`);
                if (res.data) setFormData(prev => ({ ...prev, name: res.data.name || res.data.display_name.split(',')[0] }));
            } catch (e) { console.error(e); } finally { setIsNaming(false); }
        }
    };

    const handleMarkerDrag = (latlng) => {
        setFormData(prev => ({ ...prev, lat: latlng.lat, lon: latlng.lng }));
    };

    const toggleRouteFilter = async (routeId) => {
        const id = parseInt(routeId);
        if (selectedRouteIds.includes(id)) {
            setSelectedRouteIds(selectedRouteIds.filter(rid => rid !== id));
        } else {
            setSelectedRouteIds([...selectedRouteIds, id]);
            if (!routeShapes[id]) {
                const tripsRes = await api.get('/trips');
                const routeTrips = tripsRes.data.filter(t => t.route_id === id);
                if (routeTrips.length > 0 && routeTrips[0].shape_id) {
                    const shapeRes = await api.get(`/shapes/${routeTrips[0].shape_id}`);
                    const poly = shapeRes.data.sort((a, b) => a.sequence - b.sequence).map(p => [p.lat, p.lon]);
                    setRouteShapes(prev => ({ ...prev, [id]: poly }));
                }
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, lat: parseFloat(formData.lat), lon: parseFloat(formData.lon) };
            if (editingId) await api.put(`/stops/${editingId}`, payload);
            else await api.post('/stops', payload);
            setFormData({ name: '', lat: '', lon: '' });
            setEditingId(null);
            fetchInitialData();
        } catch (e) { console.error(e); }
    };

    const startEdit = (stop) => {
        setEditingId(stop.id);
        setFormData({ name: stop.name, lat: stop.lat, lon: stop.lon });
        setMapCenter([stop.lat, stop.lon]);
        window.scrollTo(0, 0);
    };

    const handleInlineSave = async (stop, field, value) => {
        const updatedStop = { ...stop, [field]: field === 'name' ? value : parseFloat(value) };
        try {
            await api.put(`/stops/${stop.id}`, updatedStop);
            setStops(stops.map(s => s.id === stop.id ? updatedStop : s));
            setInlineEdit(null);
        } catch (e) { console.error(e); }
    };

    if (loading) return <Container className="mt-5 text-center"><Spinner animation="border" variant="primary" /></Container>;

    return (
        <Container className="mt-4" fluid>
            <div className="d-flex justify-content-between align-items-end mb-4 px-3">
                <div>
                    <h2 className="fw-bold mb-1 text-primary">Stops & Route Assignments</h2>
                    <p className="text-muted mb-0">Manage global bus stops and their route associations.</p>
                </div>
                <Badge bg="primary" pill className="px-3 py-2 shadow-sm">Total: {stops.length} Stops</Badge>
            </div>

            <Row className="g-4">
                <Col lg={4}>
                    <div className="hig-card shadow-sm">
                        <label className="small text-muted text-uppercase fw-bold mb-3 d-block">{editingId ? "Adjust Stop Location" : "Create New Stop"}</label>
                        <div style={{ height: '300px', borderRadius: '12px', overflow: 'hidden', border: '1px solid #eee' }} className="mb-4 shadow-sm">
                            <MapContainer center={mapCenter} zoom={13} style={{ height: '100%', width: '100%' }}>
                                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OSM" />
                                <LocationPicker onLocationSelect={handleMapClick} />
                                <RecenterMap center={mapCenter} />
                                
                                {selectedRouteIds.map(rid => (
                                    <Polyline key={`line-${rid}`} positions={routeShapes[rid] || []} color={`#${routes.find(r => r.id === rid)?.color}`} weight={3} opacity={0.4} dashArray="8, 8" />
                                ))}

                                {formData.lat && formData.lon && (
                                    <EditMarker position={[formData.lat, formData.lon]} onDragEnd={handleMarkerDrag} />
                                )}
                            </MapContainer>
                        </div>

                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-3">
                                <label className="small fw-bold mb-2 d-flex justify-content-between">Stop Name {isNaming && <Spinner animation="border" size="sm" />}</label>
                                <Form.Control placeholder="Name..." value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} required />
                            </Form.Group>
                            <Row className="mb-4">
                                <Col><Form.Group><label className="small text-muted fw-bold">LAT</label><Form.Control type="number" step="any" value={formData.lat} onChange={(e) => setFormData({...formData, lat: e.target.value})} required /></Form.Group></Col>
                                <Col><Form.Group><label className="small text-muted fw-bold">LON</label><Form.Control type="number" step="any" value={formData.lon} onChange={(e) => setFormData({...formData, lon: e.target.value})} required /></Form.Group></Col>
                            </Row>
                            <div className="d-grid gap-2">
                                <Button variant="primary" type="submit" className="py-2 shadow-sm">{editingId ? "Apply Map Adjustments" : "Add to Inventory"}</Button>
                                {editingId && <Button variant="light" onClick={() => {setEditingId(null); setFormData({name:'', lat:'', lon:''})}}>Cancel</Button>}
                            </div>
                        </Form>
                    </div>

                    <div className="hig-card shadow-sm mt-4">
                        <label className="small text-muted text-uppercase fw-bold mb-3 d-block">Overlay Reference Route</label>
                        <div className="d-flex flex-wrap gap-2">
                            {routes.map(r => (
                                <Button key={r.id} variant={selectedRouteIds.includes(r.id) ? "primary" : "light"} size="sm" onClick={() => toggleRouteFilter(r.id)} style={{ borderRadius: '20px', border: `1px solid #${r.color}` }}>{r.short_name}</Button>
                            ))}
                        </div>
                    </div>
                </Col>

                <Col lg={8}>
                    <div className="hig-card p-0 overflow-hidden shadow-sm">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead className="bg-light">
                                <tr>
                                    <th className="px-4">Stop Name / Coordinates</th>
                                    <th>Assignments</th>
                                    <th style={{width: '120px'}} className="text-end px-4">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {stops.map(stop => (
                                    <tr key={stop.id} style={{cursor: 'pointer'}} onClick={() => { if(inlineEdit?.id !== stop.id) startEdit(stop); }}>
                                        <td className="px-4">
                                            <div onDoubleClick={(e) => { e.stopPropagation(); setInlineEdit({ id: stop.id, field: 'name', value: stop.name }); }}>
                                                {inlineEdit?.id === stop.id && inlineEdit?.field === 'name' ? (
                                                    <Form.Control autoFocus size="sm" value={inlineEdit.value} onClick={e => e.stopPropagation()} onChange={(e) => setInlineEdit({...inlineEdit, value: e.target.value})} onBlur={() => handleInlineSave(stop, 'name', inlineEdit.value)} onKeyDown={(e) => e.key === 'Enter' && handleInlineSave(stop, 'name', inlineEdit.value)} />
                                                ) : ( <div className="fw-medium text-dark">{stop.name} <div className="small text-muted font-monospace" style={{fontSize: '10px'}}>{stop.lat.toFixed(6)}, {stop.lon.toFixed(6)}</div> </div> )}
                                            </div>
                                        </td>
                                        <td>
                                            <div className="d-flex flex-wrap gap-1 align-items-center">
                                                {(stopRouteMap[stop.id] || []).map(r => ( <Badge key={r.id} style={{backgroundColor: `#${r.color}`, fontSize: '10px'}}>{r.short_name}</Badge> ))}
                                                <Button variant="link" className="p-0 text-decoration-none small ms-1" style={{fontSize: '18px', color: '#007AFF'}} onClick={(e) => { e.stopPropagation(); setAssignmentModal({ show: true, stop, routeIds: (stopRouteMap[stop.id] || []).map(r => r.id) }); }}>+</Button>
                                            </div>
                                        </td>
                                        <td className="text-end px-4">
                                            <Button variant="link" className="text-danger p-0 text-decoration-none small" onClick={(e) => { e.stopPropagation(); if(window.confirm('Delete stop?')) api.delete(`/stops/${stop.id}`).then(fetchInitialData); }}>Delete</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Col>
            </Row>

            {/* Modal */}
            <Modal show={assignmentModal.show} onHide={() => setAssignmentModal({ ...assignmentModal, show: false })} centered>
                <div className="hig-card m-0" style={{border: 'none'}}>
                    <h5 className="fw-bold mb-4">Routes for {assignmentModal.stop?.name}</h5>
                    <ListGroup className="mb-4 shadow-sm border-0">
                        {routes.map(r => (
                            <ListGroup.Item key={r.id} action onClick={() => { const ids = assignmentModal.routeIds.includes(r.id) ? assignmentModal.routeIds.filter(id => id !== r.id) : [...assignmentModal.routeIds, r.id]; setAssignmentModal({ ...assignmentModal, routeIds: ids }); }} className={`d-flex justify-content-between align-items-center border-0 mb-1 rounded ${assignmentModal.routeIds.includes(r.id) ? 'bg-primary text-white' : 'bg-light'}`}>
                                <span className="fw-bold">{r.short_name}</span>{assignmentModal.routeIds.includes(r.id) && <span>✓</span>}
                            </ListGroup.Item>
                        ))}
                    </ListGroup>
                    <Button variant="primary" onClick={async () => { await api.put(`/stops/${assignmentModal.stop.id}/routes`, assignmentModal.routeIds); setAssignmentModal({ ...assignmentModal, show: false }); fetchInitialData(); }} className="w-100 py-2">Update Assignments</Button>
                </div>
            </Modal>
        </Container>
    );
};

export default Stops;
