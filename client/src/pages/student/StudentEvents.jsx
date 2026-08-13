import React, { useEffect, useState } from 'react';
import UniversalSkeleton from '../../components/skeletons/UniversalSkeleton';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import {
    FaCalendarDays, FaClock, FaLocationDot, FaUsers,
    FaMagnifyingGlass, FaCircleCheck, FaChevronLeft, FaChevronRight
} from 'react-icons/fa6';

const StudentEvents = () => {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);
    const [filter, setFilter] = useState('ALL');
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(true);
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showCalendar, setShowCalendar] = useState(false);

    // Calendar State
    const [currentDate, setCurrentDate] = useState(new Date());

    // Departments
    const [departments, setDepartments] = useState([]);

    useEffect(() => {
        fetchEvents();
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            const data = await API.getDepartments();
            if (Array.isArray(data)) setDepartments(data);
        } catch (err) {
            console.error("Failed to load departments", err);
        }
    };

    const fetchEvents = async () => {
        try {
            setLoading(true);
            const data = await API.getEvents();
            setEvents(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error("Failed to load campus events");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let res = events;
        if (filter !== 'ALL') {
            res = res.filter(e => e.department === filter || e.department === 'ALL');
        }
        if (search.trim()) {
            res = res.filter(e =>
                e.title.toLowerCase().includes(search.toLowerCase()) ||
                (e.location && e.location.toLowerCase().includes(search.toLowerCase())) ||
                (e.description && e.description.toLowerCase().includes(search.toLowerCase()))
            );
        }
        setFilteredEvents(res);
    }, [filter, search, events]);

    const handleRSVP = async () => {
        if (!selectedEvent) return;
        try {
            await API.rsvpEvent(selectedEvent._id);
            toast.success("Successfully registered for event!");
            setSelectedEvent(null);
            fetchEvents();
        } catch (error) {
            toast.error(error.message || "Failed to register");
        }
    };

    const isRegistered = (event) => event.attendees && event.attendees.includes(user?._id);

    const isEnded = (event) => {
        const now = new Date();
        const eventDate = new Date(event.date);
        const endDate = event.endDate ? new Date(event.endDate) : eventDate;
        const timeStr = event.endTime || (event.endDate ? '23:59' : (event.time || '23:59'));

        if (timeStr) {
            const [h, m] = timeStr.split(':');
            endDate.setHours(parseInt(h, 10), parseInt(m, 10));
        } else {
            endDate.setHours(23, 59, 59);
        }

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

    // Calendar Helper Functions
    const getDaysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year, month) => new Date(year, month, 1).getDay();

    const changeMonth = (offset) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + offset, 1));
    };

    const renderCalendar = () => {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="calendar-day empty"></div>);
        }

        const now = new Date();
        const isCurrentMonth = now.getFullYear() === year && now.getMonth() === month;

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => {
                const eStart = e.date ? e.date.split('T')[0] : '';
                const eEnd = e.endDate ? e.endDate.split('T')[0] : eStart;
                return dateStr >= eStart && dateStr <= eEnd;
            });

            const isToday = isCurrentMonth && now.getDate() === day;

            days.push(
                <div
                    key={day}
                    className={`calendar-day ${isToday ? 'today' : ''} ${dayEvents.length > 0 ? 'has-event' : ''}`}
                    onClick={() => {
                        if (dayEvents.length > 0) setSelectedEvent(dayEvents[0]);
                    }}
                >
                    <span className="day-number">{day}</span>
                    {dayEvents.length > 0 && (
                        <div className="event-dots">
                            {dayEvents.map((ev, idx) => (
                                <span key={idx} className="event-dot" title={ev.title}></span>
                            ))}
                        </div>
                    )}
                </div>
            );
        }

        const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

        return (
            <div className="calendar-wrapper bg-white rounded-4 p-4 shadow-sm border-0 mb-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="fw-bold mb-0 text-dark">
                        {monthNames[month]} {year}
                    </h5>
                    <div className="btn-group">
                        <button className="btn btn-sm btn-light border" onClick={() => changeMonth(-1)}><FaChevronLeft size={12} /></button>
                        <button className="btn btn-sm btn-light border" onClick={() => setCurrentDate(new Date())}>Today</button>
                        <button className="btn btn-sm btn-light border" onClick={() => changeMonth(1)}><FaChevronRight size={12} /></button>
                    </div>
                </div>

                <div className="calendar-grid">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                        <div key={d} className="calendar-header-day text-muted fw-bold text-center small py-2">{d}</div>
                    ))}
                    {days}
                </div>

                <style>{`
                    .calendar-grid {
                        display: grid;
                        grid-template-columns: repeat(7, 1fr);
                        gap: 6px;
                    }
                    .calendar-day {
                        aspect-ratio: 1;
                        border-radius: 12px;
                        background: #f8fafc;
                        display: flex;
                        flex-direction: column;
                        align-items: center;
                        justify-content: center;
                        position: relative;
                        cursor: pointer;
                        transition: all 0.2s ease;
                    }
                    .calendar-day:hover {
                        background: #e2e8f0;
                    }
                    .calendar-day.empty {
                        background: transparent;
                        cursor: default;
                    }
                    .calendar-day.today {
                        background: #0d6efd;
                        color: #fff;
                        font-weight: bold;
                    }
                    .calendar-day.has-event {
                        border: 2px solid #0d6efd;
                    }
                    .event-dots {
                        display: flex;
                        gap: 3px;
                        position: absolute;
                        bottom: 6px;
                    }
                    .event-dot {
                        width: 6px;
                        height: 6px;
                        border-radius: 50%;
                        background: #ffc107;
                    }
                    .calendar-day.today .event-dot {
                        background: #fff;
                    }
                `}</style>
            </div>
        );
    };

    if (loading) return <UniversalSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Campus Events" description="Discover and register for University of Cebu campus events and activities." />

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 fw-bold text-dark d-flex align-items-center">
                        <FaCalendarDays className="me-2 text-primary" /> Campus Events & Activities
                    </h2>
                    <p className="text-muted mb-0">Discover departmental assemblies, academic seminars, sports meets, and university celebrations.</p>
                </div>
                <button
                    className={`btn ${showCalendar ? 'btn-primary' : 'btn-outline-primary'} rounded-pill px-4 shadow-sm fw-semibold`}
                    onClick={() => setShowCalendar(!showCalendar)}
                >
                    <FaCalendarDays className="me-2" /> {showCalendar ? 'Hide Calendar' : 'View Calendar View'}
                </button>
            </div>

            {/* Calendar View Toggle */}
            {showCalendar && renderCalendar()}

            {/* Filter Toolbar */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
                <div className="row g-3 align-items-center">
                    <div className="col-md-6">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-0"><FaMagnifyingGlass className="text-muted" /></span>
                            <input
                                type="text"
                                className="form-control bg-light border-0"
                                placeholder="Search events..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <select
                            className="form-select bg-light border-0"
                            value={filter}
                            onChange={e => setFilter(e.target.value)}
                        >
                            <option value="ALL">All Department Scopes (Campus-Wide)</option>
                            {departments.map(d => (
                                <option key={d._id || d.code} value={d.code}>{d.code} - {d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Events Grid */}
            <div className="row g-4">
                {filteredEvents.length === 0 ? (
                    <div className="col-12 text-center py-5">
                        <div className="card border-0 shadow-sm rounded-4 p-5 text-muted bg-white">
                            <FaCalendarDays size={48} className="mb-3 opacity-25" />
                            <h5>No events found</h5>
                            <p className="mb-0">There are no upcoming activities matching your criteria.</p>
                        </div>
                    </div>
                ) : (
                    filteredEvents.map(event => {
                        const registered = isRegistered(event);
                        const ended = isEnded(event);
                        const deptMatch = departments.find(d => d.code === event.department);

                        return (
                            <div className="col-lg-4 col-md-6 col-12" key={event._id}>
                                <div className="card border-0 shadow-sm rounded-4 h-100 bg-white hover-shadow overflow-hidden d-flex flex-column">
                                    <div className="position-relative" style={{ height: '190px', backgroundColor: '#f1f5f9' }}>
                                        <img
                                            src={event.image || 'https://via.placeholder.com/300'}
                                            className="w-100 h-100 object-fit-cover"
                                            alt={event.title}
                                        />
                                        <span
                                            className="position-absolute top-0 end-0 m-3 badge px-3 py-1 rounded-pill shadow-sm text-white fw-bold"
                                            style={{ backgroundColor: event.department === 'ALL' ? '#0d6efd' : (deptMatch?.color || '#003399') }}
                                        >
                                            {event.department === 'ALL' ? 'Campus-Wide' : event.department}
                                        </span>
                                    </div>
                                    <div className="card-body p-4 d-flex flex-column flex-grow-1">
                                        <div className="d-flex justify-content-between align-items-center mb-2">
                                            <small className="text-muted d-flex align-items-center gap-1">
                                                <FaClock size={11} /> {event.date} {event.time ? `• ${formatTime(event.time)}` : ''}
                                            </small>
                                            {registered && (
                                                <span className="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-2 py-1 small">
                                                    <FaCircleCheck className="me-1" /> Registered
                                                </span>
                                            )}
                                            {ended && !registered && (
                                                <span className="badge bg-secondary rounded-pill px-2 py-1 small">
                                                    Ended
                                                </span>
                                            )}
                                        </div>

                                        <h5 className="card-title fw-bold text-dark mb-2">{event.title}</h5>

                                        <div className="text-secondary small mb-3 d-flex align-items-center gap-1">
                                            <FaLocationDot size={12} className="text-danger" /> {event.location || 'UC Main Campus'}
                                        </div>

                                        <p className="card-text text-muted small line-clamp-2 mb-3 flex-grow-1">
                                            {event.description}
                                        </p>

                                        <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
                                            <span className="small text-primary fw-semibold d-flex align-items-center gap-1">
                                                <FaUsers size={12} /> {event.attendees?.length || 0} Attending
                                            </span>
                                            <button
                                                className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold"
                                                onClick={() => setSelectedEvent(event)}
                                            >
                                                Details & RSVP
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* Event Details & RSVP Modal */}
            {selectedEvent && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex="-1">
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-primary text-white rounded-top-4">
                                <h5 className="modal-title fw-bold">{selectedEvent.title}</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setSelectedEvent(null)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <img
                                    src={selectedEvent.image || 'https://via.placeholder.com/600x300'}
                                    className="img-fluid rounded-3 mb-4 w-100 object-fit-cover shadow-sm"
                                    style={{ maxHeight: '280px' }}
                                    alt="Event"
                                />
                                <div className="row g-3 mb-4 bg-light p-3 rounded-3">
                                    <div className="col-md-6">
                                        <div className="text-muted small text-uppercase fw-semibold">Start Schedule</div>
                                        <div className="fw-bold text-dark">{selectedEvent.date} {selectedEvent.time ? `@ ${formatTime(selectedEvent.time)}` : ''}</div>
                                    </div>
                                    <div className="col-md-6">
                                        <div className="text-muted small text-uppercase fw-semibold">Venue Location</div>
                                        <div className="fw-bold text-dark">{selectedEvent.location || 'UC Main Campus'}</div>
                                    </div>
                                </div>
                                <h6 className="fw-bold text-dark mb-2">Event Description</h6>
                                <p className="text-secondary" style={{ whiteSpace: 'pre-line' }}>{selectedEvent.description}</p>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setSelectedEvent(null)}>
                                    Close
                                </button>
                                {(() => {
                                    const registered = isRegistered(selectedEvent);
                                    const ended = isEnded(selectedEvent);
                                    if (ended) {
                                        return <button className="btn btn-secondary" disabled>Event Concluded</button>;
                                    } else if (registered) {
                                        return <button className="btn btn-success" disabled><FaCircleCheck className="me-1" /> Confirmed</button>;
                                    } else {
                                        return (
                                            <button className="btn btn-primary fw-semibold" onClick={handleRSVP}>
                                                Register / RSVP for Event
                                            </button>
                                        );
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
