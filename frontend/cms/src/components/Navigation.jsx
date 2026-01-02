import React from 'react';
import { Navbar, Nav, Container } from 'react-bootstrap';
import { Link, useLocation } from 'react-router-dom';

const Navigation = () => {
    const location = useLocation();

    return (
        <Navbar bg="light" expand="lg" sticky="top" className="mb-4">
            <Container>
                <Navbar.Brand as={Link} to="/" className="text-primary">GTFS Studio</Navbar.Brand>
                <Navbar.Toggle aria-controls="basic-navbar-nav" />
                <Navbar.Collapse id="basic-navbar-nav">
                    <Nav className="ms-auto">
                        <Nav.Link as={Link} to="/agencies" active={location.pathname === '/agencies'}>Agencies</Nav.Link>
                        <Nav.Link as={Link} to="/stops" active={location.pathname === '/stops'}>Stops & Routes</Nav.Link>
                        <Nav.Link as={Link} to="/routes" active={location.pathname === '/routes'}>Route Studio</Nav.Link>
                        <Nav.Link as={Link} to="/trips" active={location.pathname === '/trips'}>Trips</Nav.Link>
                    </Nav>
                </Navbar.Collapse>
            </Container>
        </Navbar>
    );
};

export default Navigation;