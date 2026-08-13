import React, { useEffect, useState } from 'react';
import AdminAnnouncementsSkeleton from '../../components/skeletons/AdminAnnouncementsSkeleton';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import {
    FaPlus, FaTrash, FaBullhorn, FaCalendarDays, FaListUl, FaPen,
    FaTriangleExclamation, FaGraduationCap, FaBuildingColumns, FaClock,
    FaTag, FaCircleExclamation, FaCircleCheck
} from 'react-icons/fa6';
import SEO from '../../components/SEO';
import AnnouncementCalendar, { ANNOUNCEMENT_TYPES, getTypeMeta } from '../../components/announcements/AnnouncementCalendar';

const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState('list'); // 'list' or 'calendar'
    const [filterDept, setFilterDept] = useState('ALL');
    const [filterType, setFilterType] = useState('ALL');

    // Modals state
    const [showModal, setShowModal] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);

    const initialFormState = {
        title: '',
        message: '',
        department: 'ALL',
        type: 'general',
        priority: 'normal',
        startDate: new Date().toISOString().split('T')[0],
        endDate: ''
    };

    const [form, setForm] = useState(initialFormState);
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

    const openCreateModal = () => {
        setIsEditing(false);
        setEditId(null);
        setForm(initialFormState);
        setShowModal(true);
    };

    const openEditModal = (ann) => {
        setIsEditing(true);
        setEditId(ann._id);
        setForm({
            title: ann.title || '',
            message: ann.message || ann.content || '',
            department: ann.department || 'ALL',
            type: ann.type || 'general',
            priority: ann.priority || 'normal',
            startDate: ann.startDate ? new Date(ann.startDate).toISOString().split('T')[0] : (ann.date ? new Date(ann.date).toISOString().split('T')[0] : new Date().toISOString().split('T')[0]),
            endDate: ann.endDate ? new Date(ann.endDate).toISOString().split('T')[0] : ''
        });
        setShowModal(true);
    };

    const handleFormSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!form.title.trim() || !form.message.trim()) {
            toast.error("Title and message details are required");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                title: form.title.trim(),
                message: form.message.trim(),
                content: form.message.trim(),
                department: form.department,
                type: form.type,
                priority: form.type === 'suspension' ? 'urgent' : form.priority,
                startDate: form.startDate ? new Date(form.startDate) : new Date(),
                endDate: form.endDate ? new Date(form.endDate) : null
            };

            if (isEditing) {
                await API.updateAnnouncement(editId, payload);
                toast.success("Announcement updated successfully");
            } else {
                await API.createAnnouncement(payload);
                toast.success("Announcement posted successfully");
            }

            setShowModal(false);
            setForm(initialFormState);
            loadAnnouncements();
        } catch (e) {
            toast.error(e.message || "Failed to save announcement");
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
            toast.error("Failed to delete announcement");
        }
    };

    const filteredAnnouncements = announcements.filter(ann => {
        const matchesDept = filterDept === 'ALL' || ann.department === filterDept || ann.department === 'ALL';
        const matchesType = filterType === 'ALL' || (ann.type || 'general') === filterType;
        return matchesDept && matchesType;
    });

    const formatDurationText = (startDate, endDate) => {
        if (!startDate) return '';
        const start = new Date(startDate);
        const startStr = start.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        if (!endDate) return startStr;
        const end = new Date(endDate);
        const endStr = end.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${startStr} — ${endStr}`;
    };

    if (loading) return <AdminAnnouncementsSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Announcements & Bulletins" description="Manage campus-wide announcements, class suspensions, and calendar notices." />

            {/* Header with View Toggle & Action Button */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 d-flex align-items-center fw-bold text-dark font-outfit">
                        <FaBullhorn className="me-2 text-primary" /> Campus Announcements & Bulletins
                    </h2>
                    <p className="text-muted mb-0">Publish class suspensions, academic notices, administrative memos, and track schedules.</p>
                </div>
                <div className="d-flex flex-wrap align-items-center gap-2">
                    {/* View Switcher Tabs */}
                    <div className="btn-group bg-white p-1 rounded-pill shadow-sm border">
                        <button
                            type="button"
                            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${activeView === 'list' ? 'btn-primary' : 'btn-light border-0'}`}
                            onClick={() => setActiveView('list')}
                        >
                            <FaListUl size={13} /> Feed View
                        </button>
                        <button
                            type="button"
                            className={`btn btn-sm rounded-pill px-3 py-1.5 fw-semibold d-flex align-items-center gap-2 ${activeView === 'calendar' ? 'btn-primary' : 'btn-light border-0'}`}
                            onClick={() => setActiveView('calendar')}
                        >
                            <FaCalendarDays size={13} /> Schedule Calendar
                        </button>
                    </div>

                    <button
                        type="button"
                        className="btn btn-primary d-flex align-items-center gap-2 fw-semibold rounded-pill px-3.5 py-2 shadow-sm hover-lift"
                        onClick={openCreateModal}
                    >
                        <FaPlus /> Post Announcement
                    </button>
                </div>
            </div>

            {/* Filter Toolbars */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    {/* Department Scope Pills */}
                    <div className="d-flex flex-wrap align-items-center gap-2">
                        <span className="text-muted small fw-semibold text-uppercase me-1.5">Scope:</span>
                        <button
                            className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${filterDept === 'ALL' ? 'btn-dark' : 'btn-light'}`}
                            onClick={() => setFilterDept('ALL')}
                        >
                            All ({announcements.length})
                        </button>
                        {departments.map(dept => {
                            const count = announcements.filter(a => a.department === dept.code).length;
                            return (
                                <button
                                    key={dept._id || dept.code}
                                    className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${filterDept === dept.code ? 'btn-primary' : 'btn-light'}`}
                                    onClick={() => setFilterDept(dept.code)}
                                >
                                    {dept.code} ({count})
                                </button>
                            );
                        })}
                    </div>

                    {/* Type Filter Pills */}
                    {activeView === 'list' && (
                        <div className="d-flex flex-wrap align-items-center gap-2">
                            <span className="text-muted small fw-semibold text-uppercase me-1.5">Type:</span>
                            <button
                                className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold ${filterType === 'ALL' ? 'btn-secondary' : 'btn-light'}`}
                                onClick={() => setFilterType('ALL')}
                            >
                                All Types
                            </button>
                            {Object.entries(ANNOUNCEMENT_TYPES).map(([typeKey, meta]) => {
                                const Icon = meta.icon;
                                const isSel = filterType === typeKey;
                                return (
                                    <button
                                        key={typeKey}
                                        className={`btn btn-sm rounded-pill px-3 py-1 d-flex align-items-center gap-1.5 fw-semibold transition-all`}
                                        style={{
                                            backgroundColor: isSel ? meta.color : meta.bg,
                                            color: isSel ? '#ffffff' : meta.text,
                                            border: `1px solid ${meta.border}`
                                        }}
                                        onClick={() => setFilterType(typeKey)}
                                    >
                                        <Icon size={12} /> {meta.label}
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>

            {/* View Render */}
            {activeView === 'calendar' ? (
                <AnnouncementCalendar
                    announcements={announcements}
                    departments={departments}
                    onEdit={openEditModal}
                    onDelete={(id) => { setDeleteId(id); setShowDelete(true); }}
                    isAdmin={true}
                />
            ) : (
                /* List View Feed */
                <div className="row g-3">
                    <div className="col-12">
                        {filteredAnnouncements.length === 0 ? (
                            <div className="card border-0 shadow-sm rounded-4 p-5 text-center text-muted bg-white">
                                <FaBullhorn size={48} className="mb-3 opacity-25 text-secondary" />
                                <h5>No announcements found</h5>
                                <p className="mb-0">There are no active announcements matching your selected filters.</p>
                            </div>
                        ) : (
                            filteredAnnouncements.map(ann => {
                                const deptMatch = departments.find(d => d.code === ann.department);
                                const meta = getTypeMeta(ann.type);
                                const Icon = meta.icon;
                                const isSuspension = ann.type === 'suspension';

                                return (
                                    <div
                                        className="card border-0 shadow-sm rounded-4 mb-3 bg-white overflow-hidden hover-shadow transition-all"
                                        key={ann._id}
                                        style={isSuspension ? { borderLeft: `6px solid ${meta.color}` } : {}}
                                    >
                                        <div className="card-body p-4">
                                            <div className="d-flex justify-content-between align-items-start gap-3">
                                                <div className="flex-grow-1">
                                                    <div className="d-flex flex-wrap align-items-center gap-2 mb-2">
                                                        {/* Type Badge */}
                                                        <span
                                                            className="badge px-3 py-1 rounded-pill d-inline-flex align-items-center gap-1.5 fw-bold"
                                                            style={{ backgroundColor: meta.color, color: '#ffffff' }}
                                                        >
                                                            <Icon size={12} /> {meta.label}
                                                        </span>

                                                        {/* Department Scope Badge */}
                                                        <span
                                                            className="badge rounded-pill px-3 py-1 fw-bold text-white"
                                                            style={{ backgroundColor: ann.department === 'ALL' ? '#0d6efd' : (deptMatch?.color || '#003399') }}
                                                        >
                                                            {ann.department === 'ALL' ? 'Campus-Wide' : ann.department}
                                                        </span>

                                                        {/* Priority Badge */}
                                                        {ann.priority === 'urgent' && (
                                                            <span className="badge bg-danger text-white rounded-pill px-2.5 py-0.5">
                                                                URGENT
                                                            </span>
                                                        )}

                                                        {/* Effective Duration */}
                                                        <span className="text-muted small d-flex align-items-center gap-1">
                                                            <FaClock size={11} className="text-secondary" />
                                                            {formatDurationText(ann.startDate || ann.date || ann.createdAt, ann.endDate)}
                                                        </span>
                                                    </div>

                                                    <h5 className="card-title fw-bold text-dark mb-2 font-outfit">
                                                        {ann.title}
                                                    </h5>
                                                    <p className="card-text text-secondary mb-0" style={{ whiteSpace: 'pre-line' }}>
                                                        {ann.message || ann.content}
                                                    </p>
                                                </div>

                                                {/* Action Buttons */}
                                                <div className="d-flex gap-1.5 flex-shrink-0">
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-secondary btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
                                                        onClick={() => openEditModal(ann)}
                                                        title="Edit Announcement"
                                                    >
                                                        <FaPen size={13} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className="btn btn-outline-danger btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
                                                        onClick={() => { setDeleteId(ann._id); setShowDelete(true); }}
                                                        title="Delete Announcement"
                                                    >
                                                        <FaTrash size={13} />
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}

            {/* Create / Edit Announcement Modal */}
            {showModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-primary text-white rounded-top-4 p-3 px-4">
                                <h5 className="modal-title d-flex align-items-center fw-bold font-outfit">
                                    <FaBullhorn className="me-2" /> {isEditing ? 'Edit Campus Announcement' : 'Post New Campus Announcement'}
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <form onSubmit={handleFormSubmit}>
                                <div className="modal-body p-4">
                                    {/* Announcement Category Selector */}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold small text-uppercase text-muted">Announcement Category *</label>
                                        <div className="row g-2">
                                            {Object.entries(ANNOUNCEMENT_TYPES).map(([typeKey, meta]) => {
                                                const isSel = form.type === typeKey;
                                                const Icon = meta.icon;
                                                return (
                                                    <div className="col-sm-6 col-md-4" key={typeKey}>
                                                        <div
                                                            className={`p-2.5 rounded-3 border d-flex align-items-center gap-2 cursor-pointer transition-all ${
                                                                isSel ? 'border-2 shadow-sm' : 'hover-bg-light'
                                                            }`}
                                                            style={{
                                                                borderColor: isSel ? meta.color : '#e2e8f0',
                                                                backgroundColor: isSel ? meta.bg : '#ffffff',
                                                                cursor: 'pointer'
                                                            }}
                                                            onClick={() => setForm({ ...form, type: typeKey, priority: typeKey === 'suspension' ? 'urgent' : form.priority })}
                                                        >
                                                            <div
                                                                className="rounded-circle d-flex align-items-center justify-content-center text-white p-2"
                                                                style={{ backgroundColor: meta.color, width: '28px', height: '28px' }}
                                                            >
                                                                <Icon size={12} />
                                                            </div>
                                                            <div className="small fw-semibold text-dark text-truncate">
                                                                {meta.label}
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Title Input */}
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Title *</label>
                                        <input
                                            type="text"
                                            className="form-control rounded-3"
                                            placeholder="e.g. Typhoon Signal No. 2 Class Suspension, Midterm Exam Schedules"
                                            required
                                            value={form.title}
                                            onChange={e => setForm({ ...form, title: e.target.value })}
                                            autoFocus
                                        />
                                    </div>

                                    <div className="row g-3 mb-3">
                                        {/* Target Department Scope */}
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Target Department Scope *</label>
                                            <select
                                                className="form-select rounded-3"
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

                                        {/* Priority */}
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold">Priority Level</label>
                                            <select
                                                className="form-select rounded-3"
                                                value={form.priority}
                                                onChange={e => setForm({ ...form, priority: e.target.value })}
                                            >
                                                <option value="normal">Normal Priority</option>
                                                <option value="high">High Priority</option>
                                                <option value="urgent">Urgent / Emergency Alert</option>
                                            </select>
                                        </div>
                                    </div>

                                    {/* Schedule Duration / Effective Dates */}
                                    <div className="card border p-3 rounded-3 mb-3 bg-light bg-opacity-50">
                                        <label className="form-label fw-semibold small text-uppercase text-muted d-flex align-items-center gap-1.5 mb-2">
                                            <FaClock /> Schedule & Duration Range
                                        </label>
                                        <div className="row g-2">
                                            <div className="col-md-6">
                                                <label className="form-label small text-muted">Effective Start Date *</label>
                                                <input
                                                    type="date"
                                                    className="form-control form-control-sm rounded-2"
                                                    required
                                                    value={form.startDate}
                                                    onChange={e => setForm({ ...form, startDate: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-md-6">
                                                <label className="form-label small text-muted">End Date (Optional for Multi-Day Suspensions/Memos)</label>
                                                <input
                                                    type="date"
                                                    className="form-control form-control-sm rounded-2"
                                                    value={form.endDate}
                                                    onChange={e => setForm({ ...form, endDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Message Details */}
                                    <div className="mb-2">
                                        <label className="form-label fw-semibold">Details & Complete Message *</label>
                                        <textarea
                                            className="form-control rounded-3"
                                            rows="4"
                                            placeholder="Complete announcement message and guidelines..."
                                            required
                                            value={form.message}
                                            onChange={e => setForm({ ...form, message: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>

                                <div className="modal-footer bg-light rounded-bottom-4 p-3">
                                    <button type="button" className="btn btn-secondary rounded-pill px-3" onClick={() => setShowModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary rounded-pill px-4 fw-semibold" disabled={submitting}>
                                        {submitting ? 'Saving...' : (isEditing ? 'Save Changes' : 'Publish Announcement')}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDelete && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-danger text-white rounded-top-4 p-3 px-4">
                                <h5 className="modal-title d-flex align-items-center fw-bold font-outfit">
                                    <FaTrash className="me-2" /> Confirm Delete
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDelete(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="mb-0">Are you sure you want to delete this campus announcement? This action cannot be undone.</p>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4 p-3">
                                <button type="button" className="btn btn-secondary rounded-pill px-3" onClick={() => setShowDelete(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-danger rounded-pill px-4 fw-semibold" onClick={handleDelete}>
                                    Delete Announcement
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
