import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Form, Row, Col, Card, Badge } from 'react-bootstrap';
import api from '../api';

const Trips = () => {
    const [trips, setTrips] = useState([]);
    const [routes, setRoutes] = useState([]);
    const [formData, setFormData] = useState({ route_id: '', headsign: '', shape_id: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchTrips();
        fetchRoutes();
    }, []);

    // HIG Logic: Auto-suggest IDs to reduce user error
    useEffect(() => {
        if (formData.route_id && !editingId) {
            const route = routes.find(r => r.id === parseInt(formData.route_id));
            if (route) {
                const suggestedShapeId = `SHP_${route.short_name.toUpperCase()}`;
                setFormData(prev => ({ 
                    ...prev, 
                    shape_id: suggestedShapeId,
                    headsign: prev.headsign || route.long_name 
                }));
            }
        }
    }, [formData.route_id, routes, editingId]);

    const fetchTrips = async () => {
        try {
            const res = await api.get('/trips');
            setTrips(res.data);
        } catch (error) {
            console.error("Error fetching trips", error);
        }
    };

    const fetchRoutes = async () => {
        try {
            const res = await api.get('/routes');
            setRoutes(res.data);
        } catch (error) {
            console.error("Error fetching routes", error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = { ...formData, route_id: parseInt(formData.route_id) };
            if (editingId) {
                await api.put(`/trips/${editingId}`, payload);
            } else {
                await api.post('/trips', payload);
            }
            setFormData({ route_id: '', headsign: '', shape_id: '' });
            setEditingId(null);
            fetchTrips();
        } catch (error) {
            console.error("Save error", error);
        }
    };

    return (
        <Container className="mt-4" fluid>
            <div className="mb-4 px-3">
                <h2 className="fw-bold mb-1">Trips & Schedules</h2>
                <p className="text-muted">Link routes to their specific geographic paths and headsigns.</p>
            </div>

            <Row className="g-4">
                <Col lg={4}>
                    <div className="hig-card shadow-sm">
                        <h6 className="small text-muted text-uppercase fw-bold mb-4">
                            {editingId ? "Edit Trip Mapping" : "New Trip Assignment"}
                        </h6>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-4">
                                <label className="small fw-bold mb-2">Select Route</label>
                                <Form.Select 
                                    className="form-control"
                                    value={formData.route_id} 
                                    onChange={(e) => setFormData({...formData, route_id: e.target.value})} 
                                    required
                                >
                                    <option value="">-- Choose Route --</option>
                                    {routes.map(r => (
                                        <option key={r.id} value={r.id}>{r.short_name} - {r.long_name}</option>
                                    ))}
                                </Form.Select>
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <label className="small fw-bold mb-2">Headsign (Destination)</label>
                                <Form.Control 
                                    className="form-control"
                                    placeholder="e.g. To Central Terminal"
                                    value={formData.headsign} 
                                    onChange={(e) => setFormData({...formData, headsign: e.target.value})} 
                                    required 
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <label className="small fw-bold mb-2 d-flex justify-content-between">
                                    Shape Identifier 
                                    <Badge bg="light" text="dark" style={{fontSize: '10px'}}>GTFS SHAPE_ID</Badge>
                                </label>
                                <Form.Control 
                                    className="form-control font-monospace"
                                    placeholder="SHP_ID"
                                    value={formData.shape_id} 
                                    onChange={(e) => setFormData({...formData, shape_id: e.target.value})} 
                                    required 
                                />
                                <Form.Text className="text-muted small">
                                    Recommended: SHP_[ROUTE_NAME]
                                </Form.Text>
                            </Form.Group>

                            <div className="d-grid gap-2">
                                <Button variant="primary" type="submit" className="py-2">
                                    {editingId ? "Update Mapping" : "Create Trip Mapping"}
                                </Button>
                                {editingId && (
                                    <Button variant="light" onClick={() => {setEditingId(null); setFormData({route_id: '', headsign: '', shape_id: ''})}}>
                                        Cancel
                                    </Button>
                                )}
                            </div>
                        </Form>
                    </div>
                </Col>

                <Col lg={8}>
                    <div className="hig-card p-0 overflow-hidden shadow-sm">
                        <Table hover responsive className="mb-0 align-middle">
                            <thead>
                                <tr>
                                    <th style={{width: '80px'}}>ID</th>
                                    <th>Route</th>
                                    <th>Headsign</th>
                                    <th>Shape ID</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {trips.map(trip => (
                                    <tr key={trip.id}>
                                        <td className="text-muted">#{trip.id}</td>
                                        <td>
                                            <div className="d-flex align-items-center">
                                                <Badge style={{backgroundColor: `#${trip.route?.color || 'ddd'}`, marginRight: '10px'}} pill>&nbsp;</Badge>
                                                <span className="fw-bold">{trip.route?.short_name || trip.route_id}</span>
                                            </div>
                                        </td>
                                        <td>{trip.headsign}</td>
                                        <td><code className="text-primary">{trip.shape_id}</code></td>
                                        <td className="text-end">
                                            <Button variant="link" className="text-primary p-0 me-3 text-decoration-none small fw-bold" onClick={() => {
                                                setFormData({ route_id: trip.route_id, headsign: trip.headsign, shape_id: trip.shape_id });
                                                setEditingId(trip.id);
                                            }}>Edit</Button>
                                            <Button variant="link" className="text-danger p-0 text-decoration-none small" onClick={() => {
                                                if(window.confirm('Delete this trip?')) api.delete(`/trips/${trip.id}`).then(fetchTrips);
                                            }}>Delete</Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                </Col>
            </Row>
        </Container>
    );
};

export default Trips;