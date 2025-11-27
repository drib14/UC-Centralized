import React from 'react';
import { Link } from 'react-router-dom';
import { FaCode, FaKey, FaBook, FaUser } from 'react-icons/fa';
import './Documentation.css'; // We'll create a simple CSS for this

const Documentation = () => {
    return (
        <div className="documentation-page">
            <nav className="doc-navbar sticky-top">
                <div className="container d-flex justify-content-between align-items-center">
                    <Link to="/" className="navbar-brand text-white fw-bold">
                        <img src={require('../assets/uc-central-logo.png')} alt="Logo" width="30" height="30" className="d-inline-block align-text-top me-2 rounded" />
                        UC-Central API
                    </Link>
                    <div className="nav-links">
                        <Link to="/login" className="btn btn-outline-light btn-sm me-2">Login</Link>
                        <Link to="/register" className="btn btn-outline-light btn-sm me-2">Register</Link>
                        <Link to="/" className="btn btn-warning btn-sm text-dark">Landing</Link>
                    </div>
                </div>
            </nav>

            <div className="container my-5">
                <div className="row">
                    <div className="col-lg-3 d-none d-lg-block">
                        <div className="sticky-top" style={{ top: '80px' }}>
                            <div className="list-group">
                                <a href="#auth" className="list-group-item list-group-item-action">Authentication</a>
                                <a href="#users" className="list-group-item list-group-item-action">Users</a>
                                <a href="#events" className="list-group-item list-group-item-action">Events</a>
                                <a href="#merch" className="list-group-item list-group-item-action">Merchandise</a>
                                <a href="#orders" className="list-group-item list-group-item-action">Orders</a>
                                <a href="#announcements" className="list-group-item list-group-item-action">Announcements</a>
                            </div>
                        </div>
                    </div>
                    <div className="col-lg-9">
                        <div className="doc-header mb-5">
                            <h1 className="display-4 fw-bold text-primary">API Documentation</h1>
                            <p className="lead text-muted">Integrate with UC-Central platform using our REST API.</p>
                        </div>

                        <section id="auth" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2"><FaKey className="me-2"/>Authentication</h2>
                            <p>You can authenticate using <strong>JWT Token</strong> (for frontend) or <strong>API Key</strong> (for external apps).</p>

                            <div className="card mb-3">
                                <div className="card-header bg-dark text-white">Using API Key</div>
                                <div className="card-body">
                                    <p>Include your API Key in the request header:</p>
                                    <pre className="bg-light p-3 rounded"><code>x-api-key: YOUR_API_KEY</code></pre>
                                </div>
                            </div>

                            <h4 className="mt-4">Endpoints</h4>
                            <div className="api-endpoint">
                                <span className="badge bg-success">POST</span> <code>/auth/login</code>
                                <p>Login with Student ID and Password.</p>
                            </div>
                             <div className="api-endpoint">
                                <span className="badge bg-success">POST</span> <code>/auth/register</code>
                                <p>Register a new account.</p>
                            </div>
                        </section>

                        <section id="users" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2"><FaUser className="me-2"/>Users</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/users</code>
                                <p>Get all users (Admin only).</p>
                            </div>
                             <div className="api-endpoint">
                                <span className="badge bg-info">GET</span> <code>/auth/me</code>
                                <p>Get current user profile.</p>
                            </div>
                        </section>

                         <section id="events" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2"><FaBook className="me-2"/>Events</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/events</code>
                                <p>Get all events.</p>
                            </div>
                            <div className="api-endpoint">
                                <span className="badge bg-success">POST</span> <code>/events</code>
                                <p>Create a new event (Admin only).</p>
                            </div>
                        </section>

                         <section id="merch" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2">Merchandise</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/merch</code>
                                <p>Get all merchandise items.</p>
                            </div>
                        </section>

                         <section id="orders" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2">Orders</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/orders</code>
                                <p>Get all orders.</p>
                            </div>
                            <div className="api-endpoint">
                                <span className="badge bg-success">POST</span> <code>/orders</code>
                                <p>Create a new order.</p>
                            </div>
                        </section>

                         <section id="announcements" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2">Announcements</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/announcements</code>
                                <p>Get all announcements.</p>
                            </div>
                        </section>
                    </div>
                </div>
            </div>

            <footer className="bg-dark text-white text-center py-3">
                <small>&copy; {new Date().getFullYear()} UC-Central API</small>
            </footer>
        </div>
    );
};

export default Documentation;
