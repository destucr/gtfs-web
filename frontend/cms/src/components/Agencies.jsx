import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Form, Row, Col, Card, Badge } from 'react-bootstrap';
import api from '../api';

const Agencies = () => {
    const [agencies, setAgencies] = useState([]);
    const [formData, setFormData] = useState({ name: '', url: '', timezone: '' });
    const [editingId, setEditingId] = useState(null);

    useEffect(() => {
        fetchAgencies();
    }, []);

    const fetchAgencies = async () => {
        try {
            const res = await api.get('/agencies');
            setAgencies(res.data);
        } catch (error) {
            console.error("Error fetching agencies", error);
        }
    };

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            if (editingId) {
                await api.put(`/agencies/${editingId}`, formData);
            } else {
                await api.post('/agencies', formData);
            }
            setFormData({ name: '', url: '', timezone: '' });
            setEditingId(null);
            fetchAgencies();
        } catch (error) {
            console.error("Error saving agency", error);
        }
    };

    return (
        <Container className="mt-4" fluid>
            <div className="mb-4 px-3">
                <h2 className="fw-bold mb-1">Transit Agencies</h2>
                <p className="text-muted">Manage the organizations providing transit services.</p>
            </div>

            <Row className="g-4">
                <Col lg={4}>
                    <div className="hig-card shadow-sm">
                        <h6 className="small text-muted text-uppercase fw-bold mb-4">
                            {editingId ? "Edit Agency Details" : "Register New Agency"}
                        </h6>
                        <Form onSubmit={handleSubmit}>
                            <Form.Group className="mb-4">
                                <label className="small fw-bold mb-2">Agency Name</label>
                                <Form.Control 
                                    className="form-control"
                                    name="name" 
                                    value={formData.name} 
                                    onChange={handleChange} 
                                    placeholder="e.g. Purbalingga Trans"
                                    required 
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <label className="small fw-bold mb-2">Agency URL</label>
                                <Form.Control 
                                    className="form-control"
                                    name="url" 
                                    value={formData.url} 
                                    onChange={handleChange} 
                                    placeholder="https://..."
                                    required 
                                />
                            </Form.Group>

                            <Form.Group className="mb-4">
                                <label className="small fw-bold mb-2">Timezone</label>
                                <Form.Select 
                                    className="form-control"
                                    name="timezone" 
                                    value={formData.timezone} 
                                    onChange={handleChange} 
                                    required
                                >
                                    <option value="">Select Timezone</option>
                                    <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                                    <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                                    <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                                </Form.Select>
                            </Form.Group>

                            <div className="d-grid gap-2">
                                <Button variant="primary" type="submit" className="py-2">
                                    {editingId ? "Update Agency" : "Create Agency"}
                                </Button>
                                {editingId && (
                                    <Button variant="light" onClick={() => {setEditingId(null); setFormData({name: '', url: '', timezone: ''})}}>
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
                                    <th>Agency Name</th>
                                    <th>Website</th>
                                    <th>Timezone</th>
                                    <th className="text-end">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {agencies.map(agency => (
                                    <tr key={agency.id}>
                                        <td className="text-muted">#{agency.id}</td>
                                        <td><span className="fw-bold">{agency.name}</span></td>
                                        <td><a href={agency.url} target="_blank" rel="noreferrer" className="text-decoration-none small text-truncate d-inline-block" style={{maxWidth: '200px'}}>{agency.url}</a></td>
                                        <td><Badge bg="light" text="dark">{agency.timezone}</Badge></td>
                                        <td className="text-end">
                                            <Button variant="link" className="text-primary p-0 me-3 text-decoration-none small fw-bold" onClick={() => {
                                                setFormData({ name: agency.name, url: agency.url, timezone: agency.timezone });
                                                setEditingId(agency.id);
                                            }}>Edit</Button>
                                            <Button variant="link" className="text-danger p-0 text-decoration-none small" onClick={() => {
                                                if(window.confirm('Delete this agency?')) api.delete(`/agencies/${agency.id}`).then(fetchAgencies);
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

export default Agencies;