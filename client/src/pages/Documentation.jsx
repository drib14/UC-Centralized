import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FaCode, FaKey, FaBook, FaUser, FaArrowRight, FaShieldAlt, FaServer, FaGlobe } from 'react-icons/fa';
import SEO from '../components/SEO';
import logo from '../assets/uc-central-logo.svg';
import './Documentation.css';

const CodeBlock = ({ title, code, language = 'javascript' }) => (
    <div className="bg-dark rounded mt-3 code-block border border-secondary">
        <div className="d-flex justify-content-between align-items-center bg-secondary px-3 py-1 rounded-top text-white">
            <small className="fw-bold font-monospace">{title}</small>
            <small className="text-light">{language}</small>
        </div>
        <pre className="p-3 mb-0 text-white overflow-auto">
            <code style={{ fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace' }}>
                {code}
            </code>
        </pre>
    </div>
);

const EndpointBadge = ({ method, path }) => (
    <div className="d-flex align-items-center mb-2 font-monospace">
        <span className={`badge me-2 ${method === 'GET' ? 'bg-primary' : method === 'POST' ? 'bg-success' : method === 'PUT' ? 'bg-warning text-dark' : 'bg-danger'}`}>
            {method}
        </span>
        <span className="fw-bold">{path}</span>
    </div>
);

const SchemaBlock = ({ name, fields }) => (
    <div className="card mb-4 border-warning">
        <div className="card-header bg-warning text-dark fw-bold font-monospace">{name} Object</div>
        <div className="card-body bg-light">
             <pre className="mb-0"><code>{JSON.stringify(fields, null, 4)}</code></pre>
        </div>
    </div>
);

const Documentation = () => {
    const { user } = useAuth();

    return (
        <div className="documentation-page bg-light min-vh-100">
            <SEO
                title="Developer Documentation"
                description="Integrate with UC-Central OAuth 2.0 and APIs."
            />

            {/* Header */}
            <header className="bg-dark text-white py-4 shadow-sm sticky-top">
                <div className="container d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                        <img src={logo} alt="Logo" width="40" height="40" className="me-3 rounded" />
                        <div>
                            <h1 className="h4 m-0 fw-bold">UC-Central Developers</h1>
                            <small className="text-secondary">API & OAuth 2.0 Documentation</small>
                        </div>
                    </div>
                    <div>
                        {user ? (
                            <Link to="/student/developer" className="btn btn-outline-warning btn-sm fw-bold">
                                <FaCode className="me-2"/>Developer Console
                            </Link>
                        ) : (
                            <Link to="/login" className="btn btn-primary btn-sm">Login</Link>
                        )}
                    </div>
                </div>
            </header>

            <div className="container my-5">
                <div className="row">
                    {/* Sidebar */}
                    <div className="col-lg-3 d-none d-lg-block">
                        <nav className="sticky-top" style={{ top: '100px' }}>
                            <div className="list-group shadow-sm">
                                <div className="list-group-item bg-primary text-white fw-bold">Guides</div>
                                <a href="#intro" className="list-group-item list-group-item-action">Introduction</a>
                                <a href="#external-register" className="list-group-item list-group-item-action fw-bold text-success"><FaUser className="me-2"/>External Registration</a>
                                <a href="#oauth-flow" className="list-group-item list-group-item-action fw-bold text-primary"><FaShieldAlt className="me-2"/>OAuth 2.0 Flow</a>
                                <a href="#oauth-client" className="list-group-item list-group-item-action ps-4"><FaGlobe className="me-2"/>Client-Side (Frontend)</a>
                                <a href="#oauth-server" className="list-group-item list-group-item-action ps-4"><FaServer className="me-2"/>Server-Side (Backend)</a>
                                <a href="#common-errors" className="list-group-item list-group-item-action text-danger fw-bold">Common Errors</a>

                                <div className="list-group-item bg-secondary text-white fw-bold mt-3">API Reference</div>
                                <a href="#endpoints-user" className="list-group-item list-group-item-action">User Info</a>
                                <a href="#endpoints-resources" className="list-group-item list-group-item-action">Resources</a>
                            </div>
                        </nav>
                    </div>

                    {/* Content */}
                    <div className="col-lg-9">

                        {/* Introduction */}
                        <section id="intro" className="mb-5">
                            <h2 className="border-bottom pb-2">Introduction</h2>
                            <p className="lead">
                                UC-Central provides a standard <strong>OAuth 2.0 Identity Provider (IdP)</strong> service.
                                External applications can allow users to "Sign in with UC-Central" to authenticate users and access their profile information securely.
                            </p>
                            <div className="alert alert-info">
                                <strong>Base URL:</strong> <code>https://uc-centralized.vercel.app</code>
                            </div>
                        </section>

                        {/* External User Registration */}
                        <section id="external-register" className="mb-5">
                            <h2 className="border-bottom pb-2">External Registration</h2>
                            <p>If your platform collects user registrations, you can push them directly to UC-Central to create an account for them automatically.</p>

                            <EndpointBadge method="POST" path="/api/oauth/users/register" />
                            <p>This is a <strong>server-to-server</strong> request. You must provide your Client Credentials.</p>

                            <SchemaBlock name="Request Body" fields={{
                                client_id: "YOUR_CLIENT_ID",
                                client_secret: "YOUR_CLIENT_SECRET",
                                studentId: "2024001",
                                email: "student@example.com",
                                password: "Password123!",
                                firstName: "Juan",
                                lastName: "Dela Cruz",
                                department: "CCS",
                                program: "BSIT",
                                year: "3"
                            }} />

                            <div className="alert alert-info">
                                <strong>Success Response (201 Created):</strong>
                                <pre className="mb-0 mt-2"><code>{`{
    "message": "User registered successfully",
    "user": {
        "_id": "65b...",
        "studentId": "2024001",
        "email": "student@example.com"
    }
}`}</code></pre>
                            </div>
                        </section>

                        {/* OAuth Flow */}
                        <section id="oauth-flow" className="mb-5">
                            <h2 className="text-primary border-bottom pb-2">OAuth 2.0 Integration Guide</h2>
                            <p>We use the standard <strong>Authorization Code Grant</strong> flow. This ensures security by exchanging credentials only on the backend.</p>

                            <div className="card bg-light border-0 mb-4">
                                <div className="card-body">
                                    <h5 className="fw-bold">The Flow at a Glance:</h5>
                                    <ol className="mb-0">
                                        <li><strong>User</strong> clicks "Login with UC-Central" on your site.</li>
                                        <li><strong>Your App</strong> redirects the user to our <strong>Frontend Authorization Page</strong>.</li>
                                        <li><strong>User</strong> approves access.</li>
                                        <li><strong>We</strong> redirect the user back to your <code>redirect_uri</code> with a <code>code</code>.</li>
                                        <li><strong>Your Backend</strong> exchanges this <code>code</code> for an <code>access_token</code>.</li>
                                        <li><strong>Your Backend</strong> uses the token to fetch user details.</li>
                                    </ol>
                                </div>
                            </div>
                        </section>

                        {/* Client Side Implementation */}
                        <section id="oauth-client" className="mb-5">
                            <h3><FaGlobe className="me-2 text-info"/>Step 1: Client-Side (Frontend)</h3>
                            <p>Initiate the login by redirecting the browser. Do <strong>NOT</strong> make an AJAX/Fetch request here.</p>

                            <div className="alert alert-warning">
                                <strong>Crucial:</strong> You must redirect to the <code>/oauth/authorize</code> frontend route, NOT the API route.
                            </div>

                            <CodeBlock
                                title="login.html / React Component"
                                code={`// 1. Configuration
const CLIENT_ID = "YOUR_CLIENT_ID_FROM_CONSOLE";
const REDIRECT_URI = "https://your-app.com/callback"; // Must match Console exactly

// 2. Construct the Authorization URL
const authUrl = new URL("https://uc-centralized.vercel.app/oauth/authorize");
authUrl.searchParams.append("client_id", CLIENT_ID);
authUrl.searchParams.append("redirect_uri", REDIRECT_URI);
authUrl.searchParams.append("response_type", "code");

// 3. Redirect the User (On Button Click)
function loginWithUC() {
    window.location.href = authUrl.toString();
}`}
                            />
                        </section>

                        {/* Server Side Implementation */}
                        <section id="oauth-server" className="mb-5">
                            <h3><FaServer className="me-2 text-info"/>Step 2: Server-Side (Backend)</h3>
                            <p>Handle the callback and exchange the code. This example uses Node.js/Express, but the logic applies to any language.</p>

                            <EndpointBadge method="POST" path="/api/oauth/token" />

                            <CodeBlock
                                title="Node.js (Express) Callback Handler"
                                code={`// Route: GET /callback (Your Redirect URI)
app.get('/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) return res.status(400).send('No code returned');

    try {
        // 1. Exchange Code for Token (Backend Server-to-Server)
        const tokenResponse = await fetch('https://uc-centralized.vercel.app/api/oauth/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                grant_type: 'authorization_code',
                client_id: process.env.UC_CLIENT_ID,
                client_secret: process.env.UC_CLIENT_SECRET, // Store securely on your server backend!
                code: code,
                redirect_uri: "https://your-app.com/callback" // Must match initiate step
            })
        });

        const tokenData = await tokenResponse.json();

        if (!tokenResponse.ok) {
            throw new Error(tokenData.message || 'Token exchange failed');
        }

        const accessToken = tokenData.access_token;

        // 2. Get User Info
        const userResponse = await fetch('https://uc-centralized.vercel.app/api/oauth/userinfo', {
            headers: { 'Authorization': \`Bearer \${accessToken}\` }
        });

        const userData = await userResponse.json();

        // 3. Log the user in (Create session, JWT, etc.)
        console.log("User Logged In:", userData);
        res.send(\`Welcome \${userData.firstName}!\`);

    } catch (error) {
        console.error("OAuth Error:", error);
        res.status(500).send('Authentication Failed');
    }
});`}
                            />

                            <h5 className="mt-4">Token Response Format</h5>
                            <SchemaBlock name="Token Response" fields={{
                                access_token: "eyJhbGciOiJIUz...",
                                token_type: "Bearer",
                                expires_in: 86400,
                                user: {
                                    studentId: "123456",
                                    email: "student@uc.edu.ph",
                                    firstName: "John",
                                    lastName: "Doe"
                                }
                            }} />
                        </section>

                        {/* Common Errors */}
                        <section id="common-errors" className="mb-5">
                            <h2 className="text-danger border-bottom pb-2">Common Integration Errors</h2>

                            <div className="card border-danger mb-3">
                                <div className="card-header bg-danger text-white fw-bold">
                                    Error: 404 Route Not Found (POST /api/oauth/authorize)
                                </div>
                                <div className="card-body">
                                    <p><strong>Cause:</strong> You are trying to make a POST request (via Fetch/Axios) to the authorization endpoint from your code.</p>
                                    <p><strong>Fix:</strong> You must <strong>REDIRECT the browser</strong> (GET request) to the frontend URL <code>/oauth/authorize</code>. Do not use the API endpoint directly for the first step.</p>
                                </div>
                            </div>

                            <div className="card border-warning mb-3">
                                <div className="card-header bg-warning text-dark fw-bold">
                                    Error: Invalid Redirect URI
                                </div>
                                <div className="card-body">
                                    <p><strong>Cause:</strong> The <code>redirect_uri</code> parameter in your URL does not EXACTLY match what you entered in the Developer Console.</p>
                                    <p><strong>Fix:</strong> Check for trailing slashes, http vs https, or missing query parameters. It must be an exact string match.</p>
                                </div>
                            </div>
                        </section>

                        {/* Endpoints Reference */}
                        <section id="endpoints-user" className="mb-5">
                            <h2 className="border-bottom pb-2">API Reference</h2>
                            <p>Beyond OAuth, you can access public resources or user-specific data using your <code>access_token</code>.</p>

                            <div className="card mb-3">
                                <div className="card-header fw-bold">Get User Profile</div>
                                <div className="card-body">
                                    <EndpointBadge method="GET" path="/api/oauth/userinfo" />
                                    <p>Requires <code>Authorization: Bearer YOUR_TOKEN</code> header.</p>
                                    <CodeBlock title="Response" code={`{
    "_id": "65b...",
    "studentId": "2020101",
    "email": "student@uc.edu.ph",
    "firstName": "Jane",
    "lastName": "Doe",
    "department": "CCS",
    "role": "student",
    "profileImage": "https://res.cloudinary.com/.../image.jpg" // Optional
}`} />
                                    <div className="alert alert-info mt-3 small">
                                        <FaUser className="me-2" />
                                        <strong>Note on Profile Images:</strong> If the <code>profileImage</code> field is missing or null,
                                        the application generates a default placeholder using the user's initials (e.g., "JD" for Jane Doe).
                                        External applications should implement similar fallback logic.
                                    </div>
                                </div>
                            </div>
                        </section>

                        {/* Public Resources */}
                        <section id="endpoints-resources" className="mb-5">
                            <h2 className="border-bottom pb-2">Student Resources</h2>
                            <p>Authorized users can access university resources. All endpoints require <code>Authorization: Bearer TOKEN</code>.</p>

                            <div className="card mb-4">
                                <div className="card-header fw-bold bg-light">Events</div>
                                <div className="card-body">
                                    <div className="mb-4">
                                        <EndpointBadge method="GET" path="/api/events" />
                                        <p>List all upcoming and past events.</p>
                                        <CodeBlock title="Response Array" code={`[
  {
    "_id": "65c...",
    "title": "CCS Week",
    "date": "2024-05-20",
    "time": "08:00",
    "location": "Main Campus",
    "attendees": ["USER_ID_1", "USER_ID_2"],
    "image": "https://..."
  }
]`} />
                                    </div>
                                    <hr />
                                    <div className="mb-2">
                                        <EndpointBadge method="POST" path="/api/events/:id/rsvp" />
                                        <p>RSVP to an event. Returns 200 OK or 403 if already registered.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="card mb-4">
                                <div className="card-header fw-bold bg-light">Merchandise</div>
                                <div className="card-body">
                                    <EndpointBadge method="GET" path="/api/merch" />
                                    <p>List available merchandise items.</p>
                                    <CodeBlock title="Response Array" code={`[
  {
    "_id": "65d...",
    "name": "CCS Polo Shirt",
    "price": 350,
    "stock": 50,
    "category": "wearable",
    "variants": [
        { "size": "M", "color": "Blue", "stock": 20 }
    ],
    "image": "https://..."
  }
]`} />
                                </div>
                            </div>

                            <div className="card mb-4">
                                <div className="card-header fw-bold bg-light">Announcements</div>
                                <div className="card-body">
                                    <EndpointBadge method="GET" path="/api/announcements" />
                                    <p>List latest announcements.</p>
                                    <CodeBlock title="Response Array" code={`[
  {
    "_id": "65e...",
    "title": "Midterm Exam Schedule",
    "message": "Exams start next week...",
    "department": "ALL",
    "createdAt": "2024-03-10T..."
  }
]`} />
                                </div>
                            </div>
                        </section>

                    </div>
                </div>
            </div>

            <footer className="bg-dark text-white text-center py-4 mt-5">
                <div className="container">
                    <p className="mb-1">&copy; {new Date().getFullYear()} UC-Central Developer Platform</p>
                    <small className="text-secondary">Made with <FaCode/> for Developers</small>
                </div>
            </footer>
        </div>
    );
};

export default Documentation;
