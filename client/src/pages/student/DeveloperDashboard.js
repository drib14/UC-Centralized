import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaPlus, FaKey } from 'react-icons/fa6';

const DeveloperDashboard = () => {
    const [apps, setApps] = useState([]);
    const [showModal, setShowModal] = useState(false);
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
            setShowModal(false);
            setForm({ name: '', redirectUris: '', description: '' });
            loadApps();
        } catch (e) {
            toast.error(e.message || "Failed");
        }
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-primary"><FaKey className="me-2"/>Developer Console (OAuth Apps)</h2>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <FaPlus className="me-2"/>New App
                </button>
            </div>

            <div className="row g-4">
                {apps.length === 0 ? <p className="text-muted">No apps created yet.</p> : apps.map(app => (
                    <div className="col-md-6 col-lg-4" key={app._id}>
                        <div className="card h-100 shadow-sm border-primary">
                            <div className="card-body">
                                <h5 className="card-title fw-bold">{app.name}</h5>
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

            {/* Create Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white">
                                <h5 className="modal-title">Create OAuth App</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">App Name</label>
                                    <input className="form-control" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Description</label>
                                    <textarea className="form-control" value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Redirect URIs (Comma separated)</label>
                                    <input className="form-control" placeholder="https://myapp.com/callback" value={form.redirectUris} onChange={e => setForm({...form, redirectUris: e.target.value})} />
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="btn btn-primary" onClick={handleCreate}>Create App</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DeveloperDashboard;
