import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import logo from '../assets/uc-central-logo.png';
import { FaCalendarDays, FaShirt, FaBullhorn, FaArrowRight } from 'react-icons/fa6';

const Landing = () => {
    const { user } = useAuth();

    return (
        <div className="d-flex flex-column min-vh-100">
            {/* Navbar */}
            <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
                <div className="container">
                    <Link className="navbar-brand d-flex align-items-center" to="/">
                        <img src={logo} alt="Logo" style={{ height: '35px' }} className="me-2" />
                        UC-Central
                    </Link>
                    <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav">
                        <span className="navbar-toggler-icon"></span>
                    </button>
                    <div className="collapse navbar-collapse" id="navbarNav">
                        <ul className="navbar-nav ms-auto">
                            {user ? (
                                <li className="nav-item">
                                    <Link className="nav-link" to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'}>
                                        Go to Dashboard <FaArrowRight className="ms-1" />
                                    </Link>
                                </li>
                            ) : (
                                <>
                                    <li className="nav-item">
                                        <Link className="nav-link" to="/login">Login</Link>
                                    </li>
                                    <li className="nav-item ms-2">
                                        <Link className="btn btn-warning text-dark fw-bold px-4" to="/register">Register</Link>
                                    </li>
                                </>
                            )}
                        </ul>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <header className="hero-section text-center flex-grow-1 d-flex align-items-center">
                <div className="container">
                    <div className="row justify-content-center">
                        <div className="col-lg-8">
                            <h1 className="display-4 fw-bold mb-4">Your Campus, Connected.</h1>
                            <p className="lead mb-5 opacity-75">
                                Welcome to UC-Central, the ultimate hub for students and faculty.
                                Stay updated with events, grab the latest merch, and never miss an announcement.
                            </p>
                            <div className="d-flex justify-content-center gap-3">
                                <Link to="/register" className="btn btn-lg btn-warning text-dark fw-bold px-5 rounded-pill shadow">Get Started</Link>
                                <Link to="/login" className="btn btn-lg btn-outline-light fw-bold px-5 rounded-pill">Login</Link>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            {/* Features */}
            <section className="py-5">
                <div className="container py-4">
                    <div className="row text-center g-4">
                        <div className="col-md-4">
                            <div className="card h-100 p-4 border-0 shadow-sm">
                                <div className="feature-icon mx-auto mb-3">
                                    <FaCalendarDays size={32} />
                                </div>
                                <h3 className="h4 fw-bold">Events</h3>
                                <p className="text-muted">Discover and RSVP to department activities, seminars, and university-wide celebrations.</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100 p-4 border-0 shadow-sm">
                                <div className="feature-icon mx-auto mb-3">
                                    <FaShirt size={32} />
                                </div>
                                <h3 className="h4 fw-bold">Merch Store</h3>
                                <p className="text-muted">Browse and order official uniforms, lanyards, and exclusive department merchandise.</p>
                            </div>
                        </div>
                        <div className="col-md-4">
                            <div className="card h-100 p-4 border-0 shadow-sm">
                                <div className="feature-icon mx-auto mb-3">
                                    <FaBullhorn size={32} />
                                </div>
                                <h3 className="h4 fw-bold">Announcements</h3>
                                <p className="text-muted">Stay informed with the latest news, memos, and updates from the administration.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            <footer className="mt-auto py-3 bg-primary text-white text-center">
                <div className="container">
                    <p className="mb-0 small opacity-75">&copy; 2024 UC-Central. College of Computer Studies.</p>
                </div>
            </footer>
        </div>
    );
};

export default Landing;
