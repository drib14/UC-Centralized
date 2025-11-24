import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaPlus, FaPen, FaTrash, FaUsers } from 'react-icons/fa';

const AdminEvents = () => {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        title: '', date: '', time: '', location: '', department: 'ALL', description: '', image: null
    });
    const [editData, setEditData] = useState(null);
    const [deleteId, setDeleteId] = useState(null);

    useEffect(() => {
        fetchEvents();
    }, []);

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

    const handleFileChange = (e) => {
        setFormData({ ...formData, image: e.target.files[0] });
    };

    const handleEditFileChange = (e) => {
        setEditData({ ...editData, image: e.target.files[0] });
    };

    const createEvent = async () => {
        const form = new FormData();
        Object.keys(formData).forEach(key => {
            if (formData[key]) form.append(key, formData[key]);
        });

        try {
            await API.createEvent(form);
            toast.success("Event created");
            setShowCreateModal(false);
            setFormData({ title: '', date: '', time: '', location: '', department: 'ALL', description: '', image: null });
            fetchEvents();
        } catch (error) {
            toast.error(error.message || "Failed to create event");
        }
    };

    const updateEvent = async () => {
        const form = new FormData();
        Object.keys(editData).forEach(key => {
            if (editData[key] && key !== '_id' && key !== '__v' && key !== 'attendees') {
                 if (key === 'image') {
                     if (editData[key] instanceof File) {
                         form.append(key, editData[key]);
                     }
                 } else {
                     form.append(key, editData[key]);
                 }
            }
        });

        try {
            await API.updateEvent(editData._id, form);
            toast.success("Event updated");
            setShowEditModal(false);
            setEditData(null);
            fetchEvents();
        } catch (error) {
            toast.error(error.message || "Failed to update event");
        }
    };

    const deleteEvent = async () => {
        try {
            await API.deleteEvent(deleteId);
            toast.success("Event deleted");
            setShowDeleteModal(false);
            fetchEvents();
        } catch (error) {
            toast.error("Failed to delete event");
        }
    };

    const openEdit = (event) => {
        setEditData({ ...event, image: null });
        setShowEditModal(true);
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Event Management</h2>
                <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                    <FaPlus className="me-2" /> Create Event
                </button>
            </div>

            <div className="row">
                {events.map(event => (
                    <div className="col-md-4 mb-4" key={event._id}>
                        <div className="card h-100">
                            {event.image && (
                                <img src={event.image} alt={event.title} className="card-img-top" style={{height: '200px', objectFit: 'cover'}} />
                            )}
                            <div className="card-body">
                                <h5 className="card-title">{event.title}</h5>
                                <p className="text-muted small mb-1">{event.date} | {event.department}</p>
                                <p className="small mb-2 text-primary fw-bold">
                                    <FaUsers className="me-1" />
                                    Total Joined: {event.attendees ? event.attendees.length : 0}
                                </p>
                                <p className="small">{event.description.substring(0, 100)}...</p>
                                <div className="d-flex justify-content-end gap-2 mt-auto">
                                    <button className="btn btn-sm btn-outline-primary w-50" onClick={() => openEdit(event)}>
                                        <FaPen className="me-1" /> Edit
                                    </button>
                                    <button className="btn btn-sm btn-outline-danger w-50" onClick={() => { setDeleteId(event._id); setShowDeleteModal(true); }}>
                                        <FaTrash />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showCreateModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Create New Event</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowCreateModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <input className="form-control mb-3" placeholder="Title" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
                                <div className="row mb-3">
                                    <div className="col"><input type="date" className="form-control" value={formData.date} onChange={e => setFormData({...formData, date: e.target.value})} /></div>
                                    <div className="col"><input type="time" className="form-control" value={formData.time} onChange={e => setFormData({...formData, time: e.target.value})} /></div>
                                </div>
                                <input className="form-control mb-3" placeholder="Venue" value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} />
                                <select className="form-select mb-3" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                                    <option value="ALL">All Departments</option>
                                    <option value="CCS">CCS</option>
                                    <option value="CBA">CBA</option>
                                    <option value="CAS">CAS</option>
                                </select>
                                <input type="file" className="form-control mb-3" onChange={handleFileChange} />
                                <textarea className="form-control mb-3" rows="3" placeholder="Description" value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})}></textarea>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={createEvent}>Publish</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && editData && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-dark">
                                <h5 className="modal-title">Edit Event</h5>
                                <button className="btn-close" onClick={() => setShowEditModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <input className="form-control mb-3" placeholder="Title" value={editData.title} onChange={e => setEditData({...editData, title: e.target.value})} />
                                <div className="row mb-3">
                                    <div className="col"><input type="date" className="form-control" value={editData.date} onChange={e => setEditData({...editData, date: e.target.value})} /></div>
                                    <div className="col"><input type="time" className="form-control" value={editData.time} onChange={e => setEditData({...editData, time: e.target.value})} /></div>
                                </div>
                                <input className="form-control mb-3" placeholder="Venue" value={editData.location} onChange={e => setEditData({...editData, location: e.target.value})} />
                                <select className="form-select mb-3" value={editData.department} onChange={e => setEditData({...editData, department: e.target.value})}>
                                    <option value="ALL">All Departments</option>
                                    <option value="CCS">CCS</option>
                                    <option value="CBA">CBA</option>
                                    <option value="CAS">CAS</option>
                                </select>
                                <label className="small">Change Image (Optional)</label>
                                <input type="file" className="form-control mb-3" onChange={handleEditFileChange} />
                                <textarea className="form-control mb-3" rows="3" placeholder="Description" value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})}></textarea>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={updateEvent}>Update</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
            {showDeleteModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">Confirm Delete</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to delete this event?</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={deleteEvent}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminEvents;
