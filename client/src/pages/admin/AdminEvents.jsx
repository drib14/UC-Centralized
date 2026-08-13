import React, { useEffect, useState } from 'react';
import AdminEventsSkeleton from '../../components/skeletons/AdminEventsSkeleton';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import {
    FaCalendarDays, FaPlus, FaPencil, FaTrash, FaMagnifyingGlass,
    FaLocationDot, FaClock, FaCircleCheck
} from 'react-icons/fa6';

const AdminEvents = () => {
    const [events, setEvents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [deptFilter, setDeptFilter] = useState('ALL');

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    // Form Data
    const initialForm = {
        title: '',
        date: '',
        time: '',
        endDate: '',
        endTime: '',
        location: '',
        department: 'ALL',
        description: '',
        image: null
    };
    const [formData, setFormData] = useState(initialForm);
    const [editData, setEditData] = useState(null);
    const [submitting, setSubmitting] = useState(false);

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
            toast.error("Failed to load events");
        } finally {
            setLoading(false);
        }
    };

    const createEvent = async (e) => {
        if (e) e.preventDefault();
        if (!formData.title.trim() || !formData.date || !formData.time || !formData.location.trim()) {
            toast.error("Title, Date, Time, and Location are required");
            return;
        }

        setSubmitting(true);
        const data = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key]) data.append(key, formData[key]);
        });

        try {
            await API.request('/events', 'POST', data);
            toast.success("Event published successfully");
            setShowCreateModal(false);
            setFormData(initialForm);
            fetchEvents();
        } catch (error) {
            toast.error(error.message || "Failed to create event");
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (event) => {
        setEditData({
            _id: event._id,
            title: event.title,
            date: event.date ? event.date.split('T')[0] : '',
            time: event.time || '',
            endDate: event.endDate ? event.endDate.split('T')[0] : '',
            endTime: event.endTime || '',
            location: event.location || '',
            department: event.department || 'ALL',
            description: event.description || '',
            image: null
        });
        setShowEditModal(true);
    };

    const updateEvent = async (e) => {
        if (e) e.preventDefault();
        if (!editData.title.trim() || !editData.date || !editData.time || !editData.location.trim()) {
            toast.error("Title, Date, Time, and Location are required");
            return;
        }

        setSubmitting(true);
        const data = new FormData();
        Object.keys(editData).forEach(key => {
            if (editData[key]) data.append(key, editData[key]);
        });

        try {
            await API.request(`/events/${editData._id}`, 'PUT', data);
            toast.success("Event updated successfully");
            setShowEditModal(false);
            setEditData(null);
            fetchEvents();
        } catch (error) {
            toast.error(error.message || "Failed to update event");
        } finally {
            setSubmitting(false);
        }
    };

    const deleteEvent = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            await API.request(`/events/${deleteTarget._id}`, 'DELETE');
            toast.success("Event deleted");
            setShowDeleteModal(false);
            setDeleteTarget(null);
            setEvents(events.filter(e => e._id !== deleteTarget._id));
        } catch (error) {
            toast.error(error.message || "Failed to delete event");
        } finally {
            setSubmitting(false);
        }
    };

    const formatTimeDisplay = (timeStr) => {
        if (!timeStr) return 'All Day';
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour, 10);
        const m = parseInt(minute, 10);
        if (isNaN(h) || isNaN(m)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHour = h % 12 || 12;
        const formattedMinute = m < 10 ? `0${m}` : m;
        return `${formattedHour}:${formattedMinute} ${ampm}`;
    };

    const filteredEvents = events.filter(e => {
        const matchesSearch =
            e.title.toLowerCase().includes(search.toLowerCase()) ||
            (e.location && e.location.toLowerCase().includes(search.toLowerCase())) ||
            (e.description && e.description.toLowerCase().includes(search.toLowerCase()));

        const matchesDept = deptFilter === 'ALL' || e.department === deptFilter;

        return matchesSearch && matchesDept;
    });

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const upcomingEventsCount = events.filter(e => e.date >= todayStr).length;
    const pastEventsCount = events.length - upcomingEventsCount;

    if (loading) return <AdminEventsSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Event Management" description="Publish and organize campus-wide and departmental events." />

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 fw-bold text-dark d-flex align-items-center">
                        <FaCalendarDays className="me-2 text-primary" /> Campus Event Operations
                    </h2>
                    <p className="text-muted mb-0">Organize academic conferences, department weeks, tournaments, and campus-wide assemblies.</p>
                </div>
                <button
                    className="btn btn-primary d-flex align-items-center gap-2 rounded-pill px-4 py-2 fw-semibold shadow-sm"
                    onClick={() => setShowCreateModal(true)}
                >
                    <FaPlus /> Create Event
                </button>
            </div>

            {/* Metric Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Total Events</span>
                                <h3 className="fw-bold text-dark mt-1 mb-0">{events.length}</h3>
                            </div>
                            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                <FaCalendarDays size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Upcoming / Scheduled</span>
                                <h3 className="fw-bold text-success mt-1 mb-0">{upcomingEventsCount}</h3>
                            </div>
                            <div className="p-3 bg-success bg-opacity-10 text-success rounded-4">
                                <FaCircleCheck size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Past / Completed</span>
                                <h3 className="fw-bold text-secondary mt-1 mb-0">{pastEventsCount}</h3>
                            </div>
                            <div className="p-3 bg-secondary bg-opacity-10 text-secondary rounded-4">
                                <FaClock size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Department Scopes</span>
                                <h3 className="fw-bold text-info mt-1 mb-0">{departments.length} Colleges</h3>
                            </div>
                            <div className="p-3 bg-info bg-opacity-10 text-info rounded-4">
                                <FaLocationDot size={22} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
                <div className="row g-3 align-items-center">
                    <div className="col-md-7">
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
                    <div className="col-md-5">
                        <select
                            className="form-select bg-light border-0"
                            value={deptFilter}
                            onChange={e => setDeptFilter(e.target.value)}
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
                    <div className="col-12">
                        <div className="card border-0 shadow-sm rounded-4 p-5 text-center text-muted bg-white">
                            <FaCalendarDays size={48} className="mb-3 opacity-50 text-secondary" />
                            <h5>No events scheduled</h5>
                            <p className="mb-0">There are no events matching your search or department filter.</p>
                        </div>
                    </div>
                ) : (
                    filteredEvents.map(event => {
                        const deptMatch = departments.find(d => d.code === event.department);
                        return (
                            <div className="col-md-6 col-lg-4" key={event._id}>
                                <div className="card border-0 shadow-sm rounded-4 h-100 bg-white overflow-hidden d-flex flex-column">
                                    <div className="position-relative" style={{ height: '180px', backgroundColor: '#e9ecef' }}>
                                        {event.image ? (
                                            <img
                                                src={event.image}
                                                alt={event.title}
                                                className="w-100 h-100 object-fit-cover"
                                            />
                                        ) : (
                                            <div className="w-100 h-100 d-flex align-items-center justify-content-center bg-primary bg-opacity-10 text-primary">
                                                <FaCalendarDays size={48} className="opacity-50" />
                                            </div>
                                        )}
                                        <span
                                            className="position-absolute top-0 end-0 m-3 badge px-3 py-2 rounded-pill shadow-sm text-white fw-bold"
                                            style={{ backgroundColor: event.department === 'ALL' ? '#0d6efd' : (deptMatch?.color || '#003399') }}
                                        >
                                            {event.department === 'ALL' ? 'Campus-Wide' : event.department}
                                        </span>
                                    </div>
                                    <div className="card-body p-4 d-flex flex-column flex-grow-1">
                                        <div className="text-muted small mb-2 d-flex align-items-center gap-2">
                                            <FaClock size={12} />
                                            <span>{event.date} • {formatTimeDisplay(event.time)}</span>
                                        </div>
                                        <h5 className="card-title fw-bold text-dark mb-2">{event.title}</h5>
                                        <div className="text-secondary small mb-3 d-flex align-items-center gap-2">
                                            <FaLocationDot size={12} className="text-danger" />
                                            <span>{event.location}</span>
                                        </div>
                                        <p className="card-text text-muted small line-clamp-2 flex-grow-1">
                                            {event.description || 'No additional details provided.'}
                                        </p>
                                        <div className="d-flex justify-content-between align-items-center pt-3 border-top mt-auto">
                                            <button
                                                className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-2"
                                                onClick={() => openEditModal(event)}
                                            >
                                                <FaPencil /> Edit
                                            </button>
                                            <button
                                                className="btn btn-sm btn-outline-danger rounded-pill px-3 py-1.5 fw-semibold d-inline-flex align-items-center gap-2"
                                                onClick={() => { setDeleteTarget(event); setShowDeleteModal(true); }}
                                            >
                                                <FaTrash /> Delete
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {/* CREATE EVENT MODAL */}
            {showCreateModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-primary text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center fw-bold">
                                    <FaPlus className="me-2" /> Create Campus Event
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreateModal(false)}></button>
                            </div>
                            <form onSubmit={createEvent}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Event Title *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Event title"
                                            required
                                            value={formData.title}
                                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Start Schedule *</label>
                                            <div className="d-flex gap-2">
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    required
                                                    value={formData.date}
                                                    onChange={e => setFormData({ ...formData, date: e.target.value })}
                                                />
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    required
                                                    value={formData.time}
                                                    onChange={e => setFormData({ ...formData, time: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">End Schedule (Optional)</label>
                                            <div className="d-flex gap-2">
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={formData.endDate}
                                                    onChange={e => setFormData({ ...formData, endDate: e.target.value })}
                                                />
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    value={formData.endTime}
                                                    onChange={e => setFormData({ ...formData, endTime: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Venue Location *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Venue"
                                                required
                                                value={formData.location}
                                                onChange={e => setFormData({ ...formData, location: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Department Audience Scope</label>
                                            <select
                                                className="form-select"
                                                value={formData.department}
                                                onChange={e => setFormData({ ...formData, department: e.target.value })}
                                            >
                                                <option value="ALL">All Departments (Campus-Wide)</option>
                                                {departments.map(d => (
                                                    <option key={d._id || d.code} value={d.code}>{d.code} - {d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Event Banner Image</label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            onChange={e => setFormData({ ...formData, image: e.target.files[0] })}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Event Description</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            placeholder="Description"
                                            value={formData.description}
                                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light rounded-bottom-4">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary fw-semibold" disabled={submitting}>
                                        {submitting ? 'Publishing...' : 'Publish Event'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT EVENT MODAL */}
            {showEditModal && editData && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-lg modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-warning text-dark rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center fw-bold">
                                    <FaPencil className="me-2" /> Edit Event ({editData.title})
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                            </div>
                            <form onSubmit={updateEvent}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Event Title *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Event title"
                                            required
                                            value={editData.title}
                                            onChange={e => setEditData({ ...editData, title: e.target.value })}
                                        />
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Start Schedule *</label>
                                            <div className="d-flex gap-2">
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    required
                                                    value={editData.date}
                                                    onChange={e => setEditData({ ...editData, date: e.target.value })}
                                                />
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    required
                                                    value={editData.time}
                                                    onChange={e => setEditData({ ...editData, time: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">End Schedule (Optional)</label>
                                            <div className="d-flex gap-2">
                                                <input
                                                    type="date"
                                                    className="form-control"
                                                    value={editData.endDate}
                                                    onChange={e => setEditData({ ...editData, endDate: e.target.value })}
                                                />
                                                <input
                                                    type="time"
                                                    className="form-control"
                                                    value={editData.endTime}
                                                    onChange={e => setEditData({ ...editData, endTime: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="row mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Venue Location *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Venue"
                                                required
                                                value={editData.location}
                                                onChange={e => setEditData({ ...editData, location: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Department Audience Scope</label>
                                            <select
                                                className="form-select"
                                                value={editData.department}
                                                onChange={e => setEditData({ ...editData, department: e.target.value })}
                                            >
                                                <option value="ALL">All Departments (Campus-Wide)</option>
                                                {departments.map(d => (
                                                    <option key={d._id || d.code} value={d.code}>{d.code} - {d.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Change Banner Image (Optional)</label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            onChange={e => setEditData({ ...editData, image: e.target.files[0] })}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Event Description</label>
                                        <textarea
                                            className="form-control"
                                            rows="3"
                                            placeholder="Description"
                                            value={editData.description}
                                            onChange={e => setEditData({ ...editData, description: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light rounded-bottom-4">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-warning fw-semibold" disabled={submitting}>
                                        {submitting ? 'Updating...' : 'Update Event'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE EVENT MODAL */}
            {showDeleteModal && deleteTarget && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-danger text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center fw-bold">
                                    <FaTrash className="me-2" /> Confirm Delete Event
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="mb-0">
                                    Are you sure you want to delete event <strong>{deleteTarget.title}</strong> scheduled for {deleteTarget.date}?
                                </p>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-danger" onClick={deleteEvent} disabled={submitting}>
                                    {submitting ? 'Deleting...' : 'Delete Event'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminEvents;
