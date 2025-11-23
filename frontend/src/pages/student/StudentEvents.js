import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaCalendarDays, FaCalendar, FaClock, FaLocationDot } from 'react-icons/fa6';

const StudentEvents = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Departments
    const departments = [
        {id: 'CCS', name: 'College of Computer Studies'},
        {id: 'CBA', name: 'College of Business Administration'},
        {id: 'CAS', name: 'College of Arts and Sciences'}
    ];

    useEffect(() => {
        fetchEvents();
    }, []);

    useEffect(() => {
        if (filter === 'ALL') {
            setFilteredEvents(events);
        } else {
            setFilteredEvents(events.filter(e => e.department === filter || e.department === 'ALL'));
        }
    }, [filter, events]);

    const fetchEvents = async () => {
        try {
            const data = await API.getEvents();
            setEvents(data);
        } catch (error) {
            toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    const handleRSVP = async () => {
        if (!selectedEvent) return;
        try {
            await API.rsvpEvent(selectedEvent._id);
            toast.success("Successfully registered for event!");
            setSelectedEvent(null);
            fetchEvents();
        } catch (error) {
            toast.error(error.message || "Failed to RSVP");
        }
    };

    const isRegistered = (event) => event.attendees && event.attendees.includes(user?._id);

    const isEnded = (event) => {
         const eventDateStr = event.date;
         const eventTimeStr = event.time || '23:59';
         const eventDateTime = new Date(`${eventDateStr}T${eventTimeStr}`);
         return new Date() > eventDateTime;
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-success"></div></div>;

    return (
        <div className="container-fluid">
            <h2 className="mb-4 text-success">
                <FaCalendarDays className="me-2" />Events & Activities
            </h2>

            <div className="row mb-4">
                <div className="col-md-4">
                    <select className="form-select" value={filter} onChange={(e) => setFilter(e.target.value)}>
                        <option value="ALL">All Departments</option>
                        {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                </div>
            </div>

            <div className="row">
                {filteredEvents.length === 0 ? (
                    <div className="col-12 text-center mt-5"><p className="text-muted">No events found.</p></div>
                ) : (
                    filteredEvents.map(event => {
                        const registered = isRegistered(event);
                        const ended = isEnded(event);
                        const btnClass = ended ? "btn-secondary" : (registered ? "btn-secondary" : "btn-outline-success");
                        const btnText = ended ? "Event Ended" : (registered ? "Registered" : "View Details");

                        return (
                            <div className="col-md-4 mb-4" key={event._id}>
                                <div className="card h-100">
                                    <img src={event.image || 'https://via.placeholder.com/300'} className="card-img-top" alt={event.title} style={{ height: '200px', objectFit: 'cover' }} />
                                    <div className="card-body d-flex flex-column">
                                        <h5 className="card-title">{event.title}</h5>
                                        <p className="card-text text-muted small mb-2">
                                            <FaCalendar /> {event.date} {event.time ? `| ${event.time}` : ''} <br />
                                            {event.department}
                                        </p>
                                        <p className="card-text flex-grow-1">{event.description.substring(0, 80)}...</p>
                                        <button className={`btn ${btnClass} w-100 mt-auto`} onClick={() => setSelectedEvent(event)}>
                                            {btnText}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Modal */}
            {selectedEvent && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">{selectedEvent.title}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedEvent(null)}></button>
                            </div>
                            <div className="modal-body">
                                <img src={selectedEvent.image || 'https://via.placeholder.com/300'} className="img-fluid rounded mb-3 w-100" style={{ maxHeight: '300px', objectFit: 'cover' }} alt="Event" />
                                <div className="row mb-2">
                                    <div className="col-md-6">
                                        <strong><FaCalendar className="me-2" />Date:</strong>
                                        <span>{selectedEvent.date}</span>
                                    </div>
                                    <div className="col-md-6">
                                        <strong><FaClock className="me-2" />Time:</strong>
                                        <span>{selectedEvent.time}</span>
                                    </div>
                                </div>
                                <p>
                                    <strong><FaLocationDot className="me-2" />Venue:</strong>
                                    <span>{selectedEvent.location || 'TBA'}</span>
                                </p>
                                <hr />
                                <p>{selectedEvent.description}</p>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>Close</button>
                                {(() => {
                                     const registered = isRegistered(selectedEvent);
                                     const ended = isEnded(selectedEvent);
                                     if (ended) {
                                         return <button className="btn btn-secondary" disabled>Event Ended</button>;
                                     } else if (registered) {
                                         return <button className="btn btn-secondary" disabled>Already Registered</button>;
                                     } else {
                                         return <button className="btn btn-success" onClick={handleRSVP}>Register / RSVP</button>;
                                     }
                                })()}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentEvents;
