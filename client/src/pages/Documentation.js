import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaCode, FaKey, FaBook, FaUser, FaArrowRight, FaShieldAlt } from 'react-icons/fa';
import SEO from '../components/SEO';
import './Documentation.css';

const CodeBlock = ({ method, url, body, response }) => (
    <div className="bg-light p-3 rounded mt-3 code-block">
        <h6 className="fw-bold text-muted">Example Request (JavaScript)</h6>
        <pre className="mb-0"><code>{`const response = await fetch('https://uc-centralized.vercel.app/api${url}', {
    method: '${method}',
    headers: {
        'Content-Type': 'application/json'
    }${body ? `,\n    body: JSON.stringify(${JSON.stringify(body, null, 4).replace(/\n/g, '\n    ')})` : ''}
});
const data = await response.json();
console.log(data);`}</code></pre>
    </div>
);

const SchemaBlock = ({ name, fields }) => (
    <div className="card mb-4 border-warning">
        <div className="card-header bg-warning text-dark fw-bold">{name} Schema</div>
        <div className="card-body bg-light">
             <pre className="mb-0"><code>{JSON.stringify(fields, null, 4)}</code></pre>
        </div>
    </div>
);

const Documentation = () => {
    const { user } = useAuth();

    // Define Schemas manually based on Backend Models
    const userSchema = {
        studentId: "String (Required, Unique)",
        email: "String (Required, Unique)",
        password: "String (Hashed)",
        firstName: "String",
        lastName: "String",
        department: "String (Default: CCS)",
        program: "String",
        year: "String",
        role: "String (student|admin)",
        profileImage: "String (URL)",
        apiKey: "String (Sparse, Unique)"
    };

    const eventSchema = {
        title: "String",
        description: "String",
        date: "String",
        time: "String",
        location: "String",
        image: "String (URL)",
        department: "String (Default: ALL)",
        attendees: "[ObjectId (Ref: User)]"
    };

    const merchSchema = {
        name: "String",
        description: "String",
        price: "Number",
        stock: "Number",
        category: "String (wearable|accessories)",
        variants: "[{ size, color, stock }]",
        image: "String (URL)"
    };

    const orderSchema = {
        user: "ObjectId (Ref: User)",
        customerName: "String",
        items: "[{ merch, quantity, variant }]",
        totalPrice: "Number",
        status: "String (pending|processing|claimed|cancelled)",
        orderDate: "Date"
    };

    const announcementSchema = {
        title: "String",
        message: "String",
        date: "Date",
        author: "String",
        department: "String"
    };

    return (
        <div className="documentation-page">
            <SEO
                title="API Documentation"
                description="Official API Documentation for UC-Central. Learn how to integrate with our platform."
            />
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
                                <a href="#oauth" className="list-group-item list-group-item-action">OAuth 2.0 Integration</a>
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
                            <p>You can authenticate using <strong>JWT Token</strong> (for frontend), <strong>API Key</strong> (for external scripts), or <strong>OAuth 2.0</strong> (for web apps).</p>

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

                        <section id="oauth" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2"><FaShieldAlt className="me-2"/>OAuth 2.0 Integration</h2>
                            <p className="lead">Use UC-Central as an identity provider (IdP) for your external applications.</p>

                            <div className="alert alert-info">
                                <strong>What is the Redirect URI?</strong>
                                <br/>
                                The Redirect URI is a URL on <strong>YOUR application</strong> (the consumer). After a user approves access, UC-Central will redirect the user back to this URL with an authorization code.
                                <br/>
                                <em>Example: <code>https://your-awesome-app.com/callback</code> or <code>http://localhost:3000/api/auth/callback</code></em>
                            </div>

                            <div className="card mb-4">
                                <div className="card-header bg-primary text-white">Step-by-Step Integration Guide</div>
                                <div className="card-body">
                                    <ol className="mb-0">
                                        <li className="mb-3">
                                            <strong>Register your Application:</strong>
                                            <p>Go to the Developer Console (if available) or use the API to register your app. You will receive a <code>Client ID</code> and <code>Client Secret</code>. You must also whitelist your <code>Redirect URI</code>.</p>
                                        </li>
                                        <li className="mb-3">
                                            <strong>Direct User to Authorization Endpoint:</strong>
                                            <p>Redirect the user's browser to the <strong>Frontend Authorization Page</strong>:</p>
                                            <pre className="bg-light p-2 rounded"><code>https://uc-centralized.vercel.app/oauth/authorize?client_id=YOUR_ID&redirect_uri=YOUR_URI&response_type=code</code></pre>
                                            <small className="text-muted">Note: Do NOT use <code>/api/oauth/authorize</code> here. This link renders the user consent screen.</small>
                                        </li>
                                        <li className="mb-3">
                                            <strong>Handle the Callback:</strong>
                                            <p>If the user approves, they will be redirected to:</p>
                                            <pre className="bg-light p-2 rounded"><code>YOUR_REDIRECT_URI?code=AUTHORIZATION_CODE</code></pre>
                                        </li>
                                        <li>
                                            <strong>Exchange Code for Access Token:</strong>
                                            <p>Make a server-side POST request to exchange the code for a token.</p>
                                        </li>
                                    </ol>
                                </div>
                            </div>

                            <h4 className="mt-4">Endpoints</h4>

                            <div className="api-endpoint">
                                <span className="badge bg-success">POST</span> <code>/oauth/token</code>
                                <p>Exchange authorization code for access token. Call this from your backend.</p>
                                <CodeBlock method="POST" url="/oauth/token" body={{
                                    grant_type: "authorization_code",
                                    client_id: "YOUR_CLIENT_ID",
                                    client_secret: "YOUR_CLIENT_SECRET",
                                    code: "AUTH_CODE_FROM_CALLBACK",
                                    redirect_uri: "YOUR_REGISTERED_CALLBACK_URL"
                                }} />
                            </div>

                            <div className="api-endpoint">
                                <span className="badge bg-info">GET</span> <code>/oauth/userinfo</code>
                                <p>Get user details using the access token obtained in the previous step.</p>
                                <div className="bg-light p-3 rounded mt-3 code-block">
                                    <h6 className="fw-bold text-muted">Example Request</h6>
                                    <pre className="mb-0"><code>{`// Pass the access token in the Authorization header
const response = await fetch('https://uc-centralized.vercel.app/api/oauth/userinfo', {
    headers: {
        'Authorization': 'Bearer ACCESS_TOKEN'
    }
});`}</code></pre>
                                </div>
                            </div>
                        </section>

                        <section id="users" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2"><FaUser className="me-2"/>Users</h2>
                            <SchemaBlock name="User" fields={userSchema} />

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
                            <SchemaBlock name="Event" fields={eventSchema} />

                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/events</code>
                                <p>Get all events.</p>
                                <CodeBlock method="GET" url="/events" />
                            </div>
                            <div className="api-endpoint">
                                <span className="badge bg-success">POST</span> <code>/events</code>
                                <p>Create a new event (Admin only).</p>
                                <CodeBlock method="POST" url="/events" body={{ title: "Tech Talk", date: "2024-12-01", description: "Learn React", location: "AVR" }} />
                            </div>
                        </section>

                         <section id="merch" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2">Merchandise</h2>
                            <SchemaBlock name="Merch" fields={merchSchema} />

                            <div className="api-endpoint">
                                <span className="badge bg-primary">GET</span> <code>/merch</code>
                                <p>Get all merchandise items.</p>
                                <CodeBlock method="GET" url="/merch" />
                            </div>
                        </section>

                         <section id="orders" className="mb-5">
                            <h2 className="text-secondary border-bottom pb-2">Orders</h2>
                            <SchemaBlock name="Order" fields={orderSchema} />

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
                            <SchemaBlock name="Announcement" fields={announcementSchema} />

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
                <div className="container">
                    <div className="d-flex justify-content-center gap-3 mb-2">
                        <noscript>
                            <a href="/documentation.html" className="text-white text-decoration-underline small">Static Docs (HTML)</a>
                        </noscript>
                        <a href="/docs/api.md" className="text-white text-decoration-underline small">Raw Docs (Markdown)</a>
                        <a href="/api/documentation" target="_blank" className="text-white text-decoration-underline small">API Response (JSON)</a>
                    </div>
                    <small>&copy; {new Date().getFullYear()} UC-Central API</small>
                </div>
            </footer>
        </div>
    );
};

export default Documentation;
