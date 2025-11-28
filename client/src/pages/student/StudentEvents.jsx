import React, { useEffect, useState } from 'react';
import StudentEventsSkeleton from '../../components/skeletons/StudentEventsSkeleton';
import UniversalSkeleton from '../../components/skeletons/UniversalSkeleton';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaCalendar, FaClock, FaMapMarker, FaUsers } from 'react-icons/fa';
import SEO from '../../components/SEO';

const StudentEvents = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());

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

    if (loading) return <UniversalSkeleton />;

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
         const now = new Date();
         const endDate = event.endDate ? new Date(event.endDate) : new Date(event.date);
         const endTimeStr = event.endTime || event.time || '23:59';
         const [h, m] = endTimeStr.split(':');
         endDate.setHours(h, m);

         return now > endDate;
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return '';
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour, 10);
        const m = parseInt(minute, 10);
        if (isNaN(h) || isNaN(m)) return timeStr;

        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHour = h % 12 || 12;
        const formattedMinute = m < 10 ? `0${m}` : m;

        return `${formattedHour}:${formattedMinute} ${ampm}`;
    };

    // Calendar Helper
    const renderCalendar = () => {
        const today = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();

        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        const days = [];
        for (let i = 0; i < firstDay; i++) days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);

        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

            // Find events for this date (checking range)
            const dayEvents = events.filter(e => {
                const start = new Date(e.date);
                const end = e.endDate ? new Date(e.endDate) : new Date(e.date);
                // Normalize current day check
                const currentCheck = new Date(dateStr);
                // Reset times for strict date check
                start.setHours(0,0,0,0);
                end.setHours(23,59,59,999);
                currentCheck.setHours(12,0,0,0); // Midday to avoid boundary issues
                return currentCheck >= start && currentCheck <= end;
            });

            const isToday = d === today.getDate() && month === today.getMonth() && year === today.getFullYear();
            const hasEvent = dayEvents.length > 0;

            // Styling Classes
            let classes = "calendar-day p-2 border text-center position-relative ";
            let style = { minHeight: '80px', cursor: 'pointer' };
            let title = "";

            if (isToday && hasEvent) {
                // Split Highlight (Gradient)
                style.background = "linear-gradient(135deg, #0d6efd 50%, #ffc107 50%)";
                classes += "text-white fw-bold";
                title = `Today is ${dayEvents[0].title} Day!`;
            } else if (isToday) {
                classes += "bg-primary text-white fw-bold";
                title = "Date Today";
            } else if (hasEvent) {
                classes += "bg-warning text-dark fw-bold";
                // Check if it's culminating (end date)
                const evt = dayEvents[0];
                if (evt.endDate === dateStr) {
                    title = `Culminating of ${evt.title}`;
                } else {
                    title = evt.title; // Or "Event Day"
                }
            } else {
                classes += "bg-light";
            }

            days.push(
                <div key={d} className={classes} style={style} title={title}>
                    <div>{d}</div>
                    {hasEvent && <small className="d-block text-truncate" style={{fontSize:'0.6rem'}}>{dayEvents[0].title}</small>}
                </div>
            );
        }

        return (
            <div className="calendar-container mb-4">
                <div className="d-flex justify-content-between align-items-center mb-2">
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentDate(new Date(year, month - 1))}>Prev</button>
                    <h5 className="mb-0">{currentDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</h5>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => setCurrentDate(new Date(year, month + 1))}>Next</button>
                </div>
                <div className="d-grid" style={{ gridTemplateColumns: 'repeat(7, 1fr)', gap: '5px' }}>
                    {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map(day => (
                        <div key={day} className="text-center fw-bold small">{day}</div>
                    ))}
                    {days}
                </div>

                {/* Calendar Legend */}
                <div className="mt-3 d-flex gap-3 justify-content-center small">
                    <div className="d-flex align-items-center">
                        <div className="bg-primary" style={{width: '15px', height: '15px', marginRight: '5px'}}></div>
                        <span>Today's Date</span>
                    </div>
                    <div className="d-flex align-items-center">
                        <div className="bg-warning" style={{width: '15px', height: '15px', marginRight: '5px'}}></div>
                        <span>Event Date</span>
                    </div>
                    <div className="d-flex align-items-center">
                        <div style={{width: '15px', height: '15px', marginRight: '5px', background: 'linear-gradient(135deg, #0d6efd 50%, #ffc107 50%)'}}></div>
                        <span>Today is Event's Date</span>
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="container-fluid">
            <SEO title="Events" description="View and RSVP to upcoming university events." />
            <h2 className="mb-4 text-success">
                <FaCalendar className="me-2" />Events & Activities
            </h2>

            {/* Calendar Section */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="card shadow-sm">
                        <div className="card-body">
                            {renderCalendar()}
                        </div>
                    </div>
                </div>
            </div>

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

                        return (
                            <div className="col-md-4 mb-4" key={event._id}>
                                <div className="card h-100">
                                    <img src={event.image || 'https://via.placeholder.com/300'} className="card-img-top" alt={event.title} style={{ height: '200px', objectFit: 'cover' }} />
                                    <div className="card-body d-flex flex-column">
                                        <h5 className="card-title d-flex justify-content-between align-items-start">
                                            {event.title}
                                            {registered && <span className="badge bg-success ms-2" style={{fontSize: '0.7em'}}>Registered</span>}
                                            {ended && !registered && <span className="badge bg-secondary ms-2" style={{fontSize: '0.7em'}}>Ended</span>}
                                        </h5>
                                        <p className="card-text text-muted small mb-2">
                                            <FaCalendar /> {event.date} {event.time ? `| ${formatTime(event.time)}` : ''} <br />
                                            {event.endDate && (
                                                <>To: {event.endDate} {event.endTime ? `| ${formatTime(event.endTime)}` : ''} <br/></>
                                            )}
                                            {event.department}
                                        </p>
                                        <p className="card-text small text-primary fw-bold mb-2">
                                            <FaUsers className="me-1" />
                                            {event.attendees ? event.attendees.length : 0} Joined
                                        </p>
                                        <p className="card-text flex-grow-1">{event.description.substring(0, 80)}...</p>
                                        <button className="btn btn-outline-success w-100 mt-auto" onClick={() => setSelectedEvent(event)}>
                                            View Details
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
                                        <strong><FaCalendar className="me-2" />Start:</strong>
                                        <span>{selectedEvent.date} {selectedEvent.time ? `@ ${formatTime(selectedEvent.time)}` : ''}</span>
                                    </div>
                                    <div className="col-md-6">
                                        {selectedEvent.endDate && (
                                            <>
                                            <strong><FaCalendar className="me-2" />End:</strong>
                                            <span>{selectedEvent.endDate} {selectedEvent.endTime ? `@ ${formatTime(selectedEvent.endTime)}` : ''}</span>
                                            </>
                                        )}
                                    </div>
                                </div>
                                <p>
                                    <strong><FaMapMarker className="me-2" />Venue:</strong>
                                    <span>{selectedEvent.location || 'TBA'}</span>
                                </p>
                                <p className="text-primary fw-bold">
                                    <FaUsers className="me-2" />
                                    Total Students Joined: {selectedEvent.attendees ? selectedEvent.attendees.length : 0}
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
