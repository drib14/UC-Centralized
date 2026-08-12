import React, { useEffect, useState } from 'react';
import AdminAnnouncementsSkeleton from '../../components/skeletons/AdminAnnouncementsSkeleton';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash, FaBullhorn } from 'react-icons/fa6';
import SEO from '../../components/SEO';

const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filterDept, setFilterDept] = useState('ALL');
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({ title: '', message: '', department: 'ALL' });
    const [deleteId, setDeleteId] = useState(null);
    const [showDelete, setShowDelete] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadAnnouncements();
        loadDepartments();
    }, []);

    const loadDepartments = async () => {
        try {
            const data = await API.getDepartments();
            if (Array.isArray(data)) setDepartments(data);
        } catch (e) {
            console.error("Failed to load departments", e);
        }
    };

    const loadAnnouncements = async () => {
        try {
            const data = await API.getAnnouncements();
            setAnnouncements(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Failed to load announcements");
        } finally {
            setLoading(false);
        }
    };

    const handleCreate = async (e) => {
        if (e) e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) {
            toast.error("Title and message details are required");
            return;
        }

        setSubmitting(true);
        try {
            await API.createAnnouncement(form);
            toast.success("Announcement posted successfully");
            setShowCreate(false);
            setForm({ title: '', message: '', department: 'ALL' });
            loadAnnouncements();
        } catch (e) {
            toast.error(e.message || "Failed to post announcement");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteId) return;
        try {
            await API.deleteAnnouncement(deleteId);
            toast.success("Announcement deleted");
            setShowDelete(false);
            setDeleteId(null);
            loadAnnouncements();
        } catch (e) {
            toast.error("Failed to delete");
        }
    };

    const filteredAnnouncements = announcements.filter(ann => {
        if (filterDept === 'ALL') return true;
        return ann.department === filterDept || ann.department === 'ALL';
    });

    if (loading) return <AdminAnnouncementsSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Announcements" description="Manage campus-wide and department announcements." />

            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 d-flex align-items-center">
                        <FaBullhorn className="me-2 text-primary" /> Campus Announcements
                    </h2>
                    <p className="text-muted mb-0">Publish announcements for all students or target specific academic departments.</p>
                </div>
                <button className="btn btn-primary d-flex align-items-center gap-2 fw-semibold shadow-sm" onClick={() => setShowCreate(true)}>
                    <FaPlus /> Post Announcement
                </button>
            </div>

            {/* Department Filter Toolbar */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
                <div className="d-flex flex-wrap align-items-center gap-2">
                    <span className="text-muted small fw-semibold text-uppercase me-2">Scope:</span>
                    <button
                        className={`btn btn-sm rounded-pill px-3 fw-semibold ${filterDept === 'ALL' ? 'btn-primary' : 'btn-light'}`}
                        onClick={() => setFilterDept('ALL')}
                    >
                        All Departments ({announcements.length})
                    </button>
                    {departments.map(dept => {
                        const count = announcements.filter(a => a.department === dept.code).length;
                        return (
                            <button
                                key={dept._id || dept.code}
                                className={`btn btn-sm rounded-pill px-3 fw-semibold ${filterDept === dept.code ? 'btn-primary' : 'btn-light'}`}
                                onClick={() => setFilterDept(dept.code)}
                            >
                                {dept.code} ({count})
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Announcements Feed */}
            <div className="row g-3">
                <div className="col-12">
                    {filteredAnnouncements.length === 0 ? (
                        <div className="card border-0 shadow-sm rounded-4 p-5 text-center text-muted bg-white">
                            <FaBullhorn size={48} className="mb-3 opacity-50 text-secondary" />
                            <h5>No announcements found</h5>
                            <p className="mb-0">There are no active announcements in this department scope.</p>
                        </div>
                    ) : (
                        filteredAnnouncements.map(ann => {
                            const deptMatch = departments.find(d => d.code === ann.department);
                            return (
                                <div className="card border-0 shadow-sm rounded-4 mb-3 bg-white overflow-hidden" key={ann._id}>
                                    <div className="card-body p-4">
                                        <div className="d-flex justify-content-between align-items-start gap-3">
                                            <div>
                                                <div className="d-flex align-items-center gap-2 mb-2">
                                                    <span
                                                        className="badge rounded-pill px-3 py-1 fw-bold text-white"
                                                        style={{ backgroundColor: ann.department === 'ALL' ? '#0d6efd' : (deptMatch?.color || '#003399') }}
                                                    >
                                                        {ann.department === 'ALL' ? 'Campus-Wide' : ann.department}
                                                    </span>
                                                    <span className="text-muted small">
                                                        {new Date(ann.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                                                    </span>
                                                </div>
                                                <h5 className="card-title fw-bold text-dark mb-2">{ann.title}</h5>
                                                <p className="card-text text-secondary mb-0" style={{ whiteSpace: 'pre-line' }}>{ann.message}</p>
                                            </div>
                                            <button
                                                className="btn btn-outline-danger btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
                                                onClick={() => { setDeleteId(ann._id); setShowDelete(true); }}
                                                title="Delete Announcement"
                                            >
                                                <FaTrash size={14} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Create Announcement Modal */}
            {showCreate && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-primary text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center">
                                    <FaBullhorn className="me-2" /> Post Announcement
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button>
                            </div>
                            <form onSubmit={handleCreate}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Title *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Announcement title"
                                            required
                                            value={form.title}
                                            onChange={e => setForm({ ...form, title: e.target.value })}
                                            autoFocus
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Target Department Scope *</label>
                                        <select
                                            className="form-select"
                                            value={form.department}
                                            onChange={e => setForm({ ...form, department: e.target.value })}
                                        >
                                            <option value="ALL">All Departments (Campus-Wide)</option>
                                            {departments.map(d => (
                                                <option key={d._id || d.code} value={d.code}>
                                                    {d.code} - {d.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Details & Message *</label>
                                        <textarea
                                            className="form-control"
                                            rows="4"
                                            placeholder="Announcement details..."
                                            required
                                            value={form.message}
                                            onChange={e => setForm({ ...form, message: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light rounded-bottom-4">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? 'Posting...' : 'Publish Announcement'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDelete && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-danger text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center">
                                    <FaTrash className="me-2" /> Confirm Delete
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDelete(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="mb-0">Are you sure you want to delete this announcement?</p>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDelete(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-danger" onClick={handleDelete}>
                                    Delete
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAnnouncements;
