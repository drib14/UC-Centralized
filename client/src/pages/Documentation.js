import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaCode, FaKey, FaBook, FaUser, FaArrowRight } from 'react-icons/fa';
import './Documentation.css';

const CodeBlock = ({ method, url, body, response }) => (
    <div className="bg-light p-3 rounded mt-3 code-block">
        <h6 className="fw-bold text-muted">Example Request (JavaScript)</h6>
        <pre className="mb-0"><code>{`const response = await fetch('https://uc-central.vercel.app/api${url}', {
    method: '${method}',
    headers: {
        'Content-Type': 'application/json',
        'x-api-key': 'YOUR_API_KEY'
    }${body ? `,\n    body: JSON.stringify(${JSON.stringify(body, null, 4).replace(/\n/g, '\n    ')})` : ''}
});
const data = await response.json();
console.log(data);`}</code></pre>
    </div>
);

const Documentation = () => {
    const { user } = useAuth();

    return (
        <div className="documentation-page">
            <nav className="doc-navbar sticky-top">
                <div className="container d-flex justify-content-between align-items-center">
                    <Link to="/" className="navbar-brand text-white fw-bold">
                        <img src={require('../assets/uc-central-logo.png')} alt="Logo" width="30" height="30" className="d-inline-block align-text-top me-2 rounded" />
                        UC-Central API
                    </Link>
                    <div className="nav-links d-flex align-items-center">
                        {user ? (
                            <>
                                <Link to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} className="btn btn-warning btn-sm text-dark fw-bold">
                                    Go to Dashboard <FaArrowRight className="ms-1" />
                                </Link>
                            </>
                        ) : (
                            <>
                                <Link to="/login" className="btn btn-outline-light btn-sm me-2">Login</Link>
                                <Link to="/register" className="btn btn-outline-light btn-sm me-2">Register</Link>
                                <Link to="/" className="btn btn-warning btn-sm text-dark">Landing</Link>
                            </>
                        )}
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
                                <CodeBlock method="POST" url="/auth/login" body={{ studentId: "12345", password: "SecretPassword1!" }} />
                            </div>
                             <div className="api-endpoint">
                                <span className="badge bg-success">POST</span> <code>/auth/register</code>
                                <p>Register a new account.</p>
                                <CodeBlock method="POST" url="/auth/register" body={{ studentId: "12345", email: "student@uc.edu.ph", password: "Pass", firstName: "John", lastName: "Doe" }} />
                            </div>
                        </section>

                        <section id="users" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2"><FaUser className="me-2"/>Users</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/users</code>
                                <p>Get all users (Admin only).</p>
                                <CodeBlock method="GET" url="/users" />
                            </div>
                             <div className="api-endpoint">
                                <span className="badge bg-info">GET</span> <code>/auth/me</code>
                                <p>Get current user profile.</p>
                                <CodeBlock method="GET" url="/auth/me" />
                            </div>
                        </section>

                         <section id="events" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2"><FaBook className="me-2"/>Events</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/events</code>
                                <p>Get all events.</p>
                                <CodeBlock method="GET" url="/events" />
                            </div>
                            <div className="api-endpoint">
                                <span className="badge bg-success">POST</span> <code>/events</code>
                                <p>Create a new event (Admin only).</p>
                                <CodeBlock method="POST" url="/events" body={{ title: "Tech Talk", date: "2024-12-01", description: "Learn React" }} />
                            </div>
                        </section>

                         <section id="merch" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2">Merchandise</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/merch</code>
                                <p>Get all merchandise items.</p>
                                <CodeBlock method="GET" url="/merch" />
                            </div>
                        </section>

                         <section id="orders" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2">Orders</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/orders</code>
                                <p>Get all orders.</p>
                                <CodeBlock method="GET" url="/orders" />
                            </div>
                            <div className="api-endpoint">
                                <span className="badge bg-success">POST</span> <code>/orders</code>
                                <p>Create a new order.</p>
                                <CodeBlock method="POST" url="/orders" body={{ items: [{ merch: "item_id", quantity: 1 }], totalPrice: 500 }} />
                            </div>
                        </section>

                         <section id="announcements" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2">Announcements</h2>
                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/announcements</code>
                                <p>Get all announcements.</p>
                                <CodeBlock method="GET" url="/announcements" />
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
