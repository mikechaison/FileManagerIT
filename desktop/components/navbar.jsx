import React from 'react';
import { Navbar, Nav, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';

export default function FileManagerNavbar({ userEmail, handleLogout }) {
    return (
        <Navbar bg="light" variant="light" expanded="sm" className="shadow-sm">
            <Navbar.Brand as={Link} to="/" className="fw-bold ms-3">
                File Manager
            </Navbar.Brand>
            <Navbar.Collapse id="basic-navbar-nav">
                <Nav className="ms-auto me-3 d-flex align-items-center">
                    {userEmail && (
                        <Navbar.Text className="me-3 text-muted">
                            <strong className="text-dark">{userEmail}</strong>
                        </Navbar.Text>
                    )}
                    <Button variant="outline-danger" onClick={handleLogout} size="sm">
                        Log Out
                    </Button>
                </Nav>
            </Navbar.Collapse>
        </Navbar>
    );
}