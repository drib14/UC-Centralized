import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/uc-central-logo.svg';
import { FaCalendarDays, FaShirt, FaBullhorn, FaArrowRight, FaGraduationCap, FaShieldHalved } from 'react-icons/fa6';
import SEO from '../components/SEO';

const Landing = () => {
    const { user } = useAuth();

    return (
        <div className="d-flex flex-column min-vh-100 bg-light">
            <SEO
                title="Home"
                description="Welcome to UC-Central, the official digital hub for University of Cebu students and faculty."
            />
            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark sticky-top">
                <div className="container">
                    <Link className="navbar-brand d-flex align-items-center gap-2" to="/">
                        <img src={logo} alt="UC Logo" style={{ height: '42px' }} className="rounded-circle bg-white p-1 shadow-sm" />
                        <span className="fw-bold tracking-tight">UC-Central</span>
                    </Link>
                    <button className="navbar-toggler border-0 shadow-none" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-auto align-items-center gap-2">
                            {user ? (
                                <li className="nav-item">
                                    <Link className="btn btn-warning text-dark fw-bold px-4 py-2 rounded-pill shadow-sm d-flex align-items-center gap-2" to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}>
                                        <span>Dashboard</span> <FaArrowRight size={14} />
                                    </Link>
                                </li>
                            ) : (
                                <>
                                    <li className="nav-item">
                                        <Link className="nav-link px-3" to="/login">Login</Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link className="btn btn-warning text-dark fw-bold px-4 py-2 rounded-pill shadow-sm" to="/register">Create Account</Link>
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero-section text-center flex-grow-1 d-flex align-items-center py-5">
                <div className="container position-relative z-1 py-4">
                    <div className="row justify-content-center">
                        <div className="col-lg-9">
                            <div className="d-inline-flex align-items-center gap-2 px-3 py-1 mb-4 rounded-pill bg-white bg-opacity-10 border border-white border-opacity-20 text-warning small fw-semibold backdrop-blur">
                                <FaGraduationCap /> University of Cebu Official Digital Platform
                            </div>
                            <h1 className="fw-bolder mb-4 text-white font-outfit" style={{ fontSize: 'clamp(1.85rem, 4.5vw + 0.5rem, 3.5rem)', lineHeight: 1.15 }}>
                                Your Campus Life, <span style={{ color: '#fbbf24' }}>Centralized.</span>
                            </h1>
                            <p className="lead mb-4 mb-sm-5 text-white text-opacity-85 fs-5 mx-auto" style={{ maxWidth: '680px', fontSize: 'clamp(0.95rem, 1.2vw + 0.5rem, 1.25rem)' }}>
                                Welcome to UC-Central, the unified platform for University of Cebu students and administrators.
                                Stay ahead with university events, departmental merchandise, and official announcements.
                            </p>
                            <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                                <Link to="/register" className="btn btn-lg btn-warning text-dark fw-bold px-4 px-sm-5 py-3 rounded-pill shadow-lg hover-lift">
                                    Get Started Free
                                </Link>
                                <Link to="/login" className="btn btn-lg btn-outline-light fw-bold px-4 px-sm-5 py-3 rounded-pill hover-lift">
                                    Student & Faculty Login
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features Section */}
            <section className="py-5 bg-white">
                <div className="container py-4">
                    <div className="text-center mb-5">
                        <span className="badge bg-primary bg-opacity-10 text-primary px-3 py-2 rounded-pill fw-semibold mb-2">Campus Ecosystem</span>
                        <h2 className="fw-bold text-dark">Everything You Need in One Hub</h2>
                        <p className="text-muted">Designed for seamless collaboration across all University of Cebu departments.</p>
                    </div>

                    <div className="row g-4">
                        <div className="col-md-4">
                            <div className="card h-100 p-4 border rounded-4 shadow-sm hover-shadow">
                                <div className="feature-icon mb-3">
                                    <FaCalendarDays size={28} />
                                </div>
                                <h3 className="h4 fw-bold text-dark mb-2">Campus Events</h3>
                                <p className="text-muted mb-0">Discover, RSVP, and engage in departmental activities, academic seminars, and university competitions.</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100 p-4 border rounded-4 shadow-sm hover-shadow">
                                <div className="feature-icon mb-3">
                                    <FaShirt size={28} />
                                </div>
                                <h3 className="h4 fw-bold text-dark mb-2">Official Merch Store</h3>
                                <p className="text-muted mb-0">Browse and order official uniforms, departmental lanyards, shirts, and accessories with live inventory tracking.</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100 p-4 border rounded-4 shadow-sm hover-shadow">
                                <div className="feature-icon mb-3">
                                    <FaBullhorn size={28} />
                                </div>
                                <h3 className="h4 fw-bold text-dark mb-2">Real-Time Announcements</h3>
                                <p className="text-muted mb-0">Stay informed with verified notifications, memos, and administrative updates tailored to your college.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="mt-auto py-4 text-white text-center">
                <div className="container">
                    <div className="d-flex flex-column flex-md-row justify-content-between align-items-center gap-3">
                        <div className="d-flex align-items-center gap-2">
                            <img src={logo} alt="UC Logo" style={{ height: '30px' }} className="rounded-circle bg-white p-1" />
                            <span className="fw-bold">University of Cebu</span>
                        </div>
                        <p className="mb-0 small text-white text-opacity-75">
                            &copy; {new Date().getFullYear()} UC-Central. Democratize Quality Education.
                        </p>
                    </div>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
