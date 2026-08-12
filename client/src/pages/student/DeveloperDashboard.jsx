import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaPlus, FaKey, FaPen, FaTrash } from 'react-icons/fa6';

const DeveloperDashboard = () => {
    const [apps, setApps] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentAppId, setCurrentAppId] = useState(null);
    const [form, setForm] = useState({ name: '', redirectUris: '', description: '' });

    useEffect(() => {
        loadApps();
    }, []);

    const loadApps = async () => {
        try {
            const data = await API.request('/oauth/apps');
            setApps(data);
        } catch (e) { console.error(e); }
    };

    const handleCreate = async () => {
        if (!form.name || !form.redirectUris) return toast.error("Name and Redirect URI required");

        try {
            await API.request('/oauth/register', 'POST', {
                ...form,
                redirectUris: form.redirectUris.split(',').map(u => u.trim())
            });
            toast.success("App created!");
            closeModal();
            loadApps();
        } catch (e) {
            toast.error(e.message || "Failed");
        }
    };

    const handleUpdate = async () => {
        if (!form.name || !form.redirectUris) return toast.error("Name and Redirect URI required");

        try {
            await API.request(`/oauth/apps/${currentAppId}`, 'PUT', {
                ...form,
                redirectUris: form.redirectUris.split(',').map(u => u.trim())
            });
            toast.success("App updated!");
            closeModal();
            loadApps();
        } catch (e) {
            toast.error(e.message || "Failed");
        }
    };

    const handleDelete = async () => {
        try {
            await API.request(`/oauth/apps/${currentAppId}`, 'DELETE');
            toast.success("App deleted!");
            closeDeleteModal();
            loadApps();
        } catch (e) {
            toast.error(e.message || "Failed");
        }
    };

    const openCreateModal = () => {
        setIsEditing(false);
        setForm({ name: '', redirectUris: '', description: '' });
        setShowModal(true);
    };

    const openEditModal = (app) => {
        setIsEditing(true);
        setCurrentAppId(app._id);
        setForm({
            name: app.name,
            description: app.description || '',
            redirectUris: app.redirectUris.join(', ')
        });
        setShowModal(true);
    };

    const openDeleteModal = (id) => {
        setCurrentAppId(id);
        setShowDeleteModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setForm({ name: '', redirectUris: '', description: '' });
        setIsEditing(false);
        setCurrentAppId(null);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setCurrentAppId(null);
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary"><FaKey className="me-2"/>Developer Console (OAuth Apps)</h2>
                <button className="btn btn-primary" onClick={openCreateModal}>
                    <FaPlus className="me-2"/>New App
                </button>
            </div>

            <div className="row g-4">
                {apps.length === 0 ? <p className="text-muted">No apps created yet.</p> : apps.map(app => (
                    <div className="col-md-6 col-lg-4" key={app._id}>
                        <div className="card h-100 shadow-sm border-primary">
                            <div className="card-body position-relative">
                                <div className="position-absolute top-0 end-0 p-3">
                                    <button className="btn btn-sm btn-outline-secondary me-2" onClick={() => openEditModal(app)} title="Edit">
                                        <FaPen />
                                    </button>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => openDeleteModal(app._id)} title="Delete">
                                        <FaTrash />
                                    </button>
                                </div>
                                <h5 className="card-title fw-bold pe-5">{app.name}</h5>
                                <p className="card-text small text-muted">{app.description || 'No description'}</p>
                                <hr/>
                                <div className="mb-2">
                                    <small className="fw-bold d-block text-secondary">Client ID</small>
                                    <code className="d-block p-1 bg-light rounded text-break">{app.clientId}</code>
                                </div>
                                <div className="mb-2">
                                    <small className="fw-bold d-block text-secondary">Client Secret</small>
                                    <code className="d-block p-1 bg-light rounded text-break">{app.clientSecret}</code>
                                </div>
                                <div>
                                    <small className="fw-bold d-block text-secondary">Redirect URIs</small>
                                    {app.redirectUris.map(u => <span key={u} className="badge bg-secondary me-1">{u}</span>)}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">{isEditing ? 'Edit OAuth App' : 'Create OAuth App'}</h5>
                                <button className="btn-close btn-close-white" onClick={closeModal}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">App Name</label>
                                    <input type="text" className="form-control" placeholder="My Campus Portal" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-control" placeholder="Application description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Redirect URIs (Comma separated)</label>
                                    <input type="text" className="form-control" placeholder="https://myapp.com/callback" value={form.redirectUris} onChange={e => setForm({...form, redirectUris: e.target.value})} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button className="btn btn-primary" onClick={isEditing ? handleUpdate : handleCreate}>
                                    {isEditing ? 'Save Changes' : 'Create App'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteModal && (
                <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">Confirm Delete</h5>
                                <button className="btn-close btn-close-white" onClick={closeDeleteModal}></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to delete this app? This action cannot be undone.</p>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={closeDeleteModal}>Cancel</button>
                                <button className="btn btn-danger" onClick={handleDelete}>Delete App</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeveloperDashboard;
