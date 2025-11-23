import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { FaBullhorn, FaCalendar } from 'react-icons/fa6';
import { Link } from 'react-router-dom';

const StudentDashboard = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // We use Promise.allSettled to allow partial loading if one fails
                const results = await Promise.allSettled([
                    API.getAnnouncements(),
                    API.getEvents()
                ]);

                if (results[0].status === 'fulfilled') {
                    setAnnouncements(results[0].value);
                } else {
                    console.error("Failed to load announcements", results[0].reason);
                }

                if (results[1].status === 'fulfilled') {
                    const eventData = results[1].value;
                    const now = new Date();
                    // Filter upcoming
                    const upcoming = eventData.filter(event => {
                        // Assuming event.date is YYYY-MM-DD or ISO
                        const eventDateStr = event.date;
                        if (!eventDateStr) return false;

                        // Handle potential different date formats or time
                        // If just date, we assume end of day or use event.time
                        const timePart = event.time || '23:59';
                        const dateTimeStr = eventDateStr.includes('T') ? eventDateStr : `${eventDateStr}T${timePart}`;

                        const eventDateTime = new Date(dateTimeStr);
                        return eventDateTime >= now;
                    });
                    setEvents(upcoming.slice(0, 3));
                } else {
                     console.error("Failed to load events", results[1].reason);
                }
            } catch (error) {
                console.error("Dashboard error", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    if (loading) {
        return (
            <div className="text-center my-5">
                <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            {/* Welcome Section */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="p-5 mb-4 bg-light rounded-3 border-start border-5 border-success">
                        <div className="container-fluid py-2">
                            <h1 className="display-5 fw-bold text-success">Welcome back!</h1>
                            <p className="col-md-8 fs-4">
                                Check out the latest announcements and upcoming events for your department.
                            </p>
                            <Link to="/student/events" className="btn btn-primary btn-lg">Browse Events</Link>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row">
                {/* Announcements Feed */}
                <div className="col-lg-8">
                    <h3 className="mb-3 text-success">
                        <FaBullhorn className="me-2" />Announcements
                    </h3>
                    <div id="announcements-feed">
                        {announcements.length === 0 ? (
                            <p className="text-muted">No announcements yet.</p>
                        ) : (
                            announcements.map((ann, index) => (
                                <div className="card mb-3" key={ann._id || index}>
                                    <div className="card-body">
                                        <h5 className="card-title">{ann.title}</h5>
                                        <h6 className="card-subtitle mb-2 text-muted">
                                            Posted on {new Date(ann.createdAt || ann.date).toLocaleDateString()} by {ann.author || "Admin"}
                                            <span className="badge bg-light text-dark border ms-2">{ann.department}</span>
                                        </h6>
                                        <p className="card-text">{ann.message}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Upcoming Events Sidebar */}
                <div className="col-lg-4">
                    <h3 className="mb-3 text-success">
                        <FaCalendar className="me-2" />Upcoming
                    </h3>
                    <div id="upcoming-events-sidebar">
                        {events.length === 0 ? (
                            <p className="text-muted">No upcoming events.</p>
                        ) : (
                            events.map((event, index) => (
                                <div className="card mb-3" key={event._id || index}>
                                    <div className="card-body">
                                        <h6 className="fw-bold">{event.title}</h6>
                                        <p className="small text-muted mb-1"><i className="fa-regular fa-clock me-1"></i>{event.date}</p>
                                        <p className="small mb-0">{event.location || 'TBA'}</p>
                                        <Link to="/student/events" className="btn btn-sm btn-outline-success mt-2 w-100">View Details</Link>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
