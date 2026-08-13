import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import AdminDepartmentsSkeleton from '../../components/skeletons/AdminDepartmentsSkeleton';
import {
    FaBuildingColumns, FaPlus, FaPencil, FaTrash, FaMagnifyingGlass,
    FaCircleCheck, FaCircleXmark, FaPalette, FaUsers
} from 'react-icons/fa6';

const COLOR_PRESETS = [
    { label: 'Navy Blue', color: '#003399' },
    { label: 'Gold Amber', color: '#cc8800' },
    { label: 'Forest Green', color: '#008844' },
    { label: 'Crimson Red', color: '#cc4400' },
    { label: 'Royal Purple', color: '#660099' },
    { label: 'Teal Blue', color: '#009999' },
    { label: 'Charcoal', color: '#333333' },
    { label: 'Ruby', color: '#e60000' }
];

const AdminDepartments = () => {
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');

    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        code: '',
        name: '',
        description: '',
        color: '#003399',
        isActive: true
    });

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editData, setEditData] = useState(null);

    // Delete Confirmation State
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        fetchDepartments();
    }, []);

    const fetchDepartments = async () => {
        try {
            setLoading(true);
            const data = await API.getAllDepartments();
            setDepartments(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error(error.message || "Failed to load departments");
        } finally {
            setLoading(false);
        }
    };

    // Create Department
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!createForm.code.trim() || !createForm.name.trim()) {
            toast.error("Department Code and Name are required");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                ...createForm,
                code: createForm.code.trim().toUpperCase(),
                name: createForm.name.trim(),
                description: createForm.description.trim()
            };
            const created = await API.createDepartment(payload);
            toast.success(`Department ${created.code} created successfully`);
            setDepartments([...departments, created]);
            setShowCreateModal(false);
            setCreateForm({
                code: '',
                name: '',
                description: '',
                color: '#003399',
                isActive: true
            });
        } catch (error) {
            toast.error(error.message || "Failed to create department");
        } finally {
            setSubmitting(false);
        }
    };

    // Edit Department
    const openEdit = (dept) => {
        setEditData({
            _id: dept._id,
            code: dept.code,
            name: dept.name,
            description: dept.description || '',
            color: dept.color || '#003399',
            isActive: dept.isActive !== undefined ? dept.isActive : true
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!editData.code.trim() || !editData.name.trim()) {
            toast.error("Department Code and Name are required");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                code: editData.code.trim().toUpperCase(),
                name: editData.name.trim(),
                description: editData.description.trim(),
                color: editData.color,
                isActive: editData.isActive
            };
            const updated = await API.updateDepartment(editData._id, payload);
            toast.success(`Department ${updated.code} updated successfully`);
            setDepartments(departments.map(d => d._id === updated._id ? updated : d));
            setShowEditModal(false);
            setEditData(null);
        } catch (error) {
            toast.error(error.message || "Failed to update department");
        } finally {
            setSubmitting(false);
        }
    };

    // Quick Status Toggle
    const handleToggleStatus = async (dept) => {
        try {
            const newStatus = !dept.isActive;
            const updated = await API.updateDepartment(dept._id, { isActive: newStatus });
            toast.success(`${updated.code} is now ${newStatus ? 'Active' : 'Inactive'}`);
            setDepartments(departments.map(d => d._id === updated._id ? updated : d));
        } catch (error) {
            toast.error(error.message || "Failed to update status");
        }
    };

    // Delete Department
    const openDelete = (dept) => {
        setDeleteTarget(dept);
        setShowDeleteModal(true);
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            await API.deleteDepartment(deleteTarget._id);
            toast.success(`Department ${deleteTarget.code} deleted`);
            setDepartments(departments.filter(d => d._id !== deleteTarget._id));
            setShowDeleteModal(false);
            setDeleteTarget(null);
        } catch (error) {
            toast.error(error.message || "Failed to delete department");
        } finally {
            setSubmitting(false);
        }
    };

    // Filtering
    const filteredDepartments = departments.filter(d => {
        const matchesSearch =
            d.code.toLowerCase().includes(search.toLowerCase()) ||
            d.name.toLowerCase().includes(search.toLowerCase()) ||
            (d.description && d.description.toLowerCase().includes(search.toLowerCase()));

        const matchesStatus =
            statusFilter === 'ALL' ||
            (statusFilter === 'ACTIVE' && d.isActive) ||
            (statusFilter === 'INACTIVE' && !d.isActive);

        return matchesSearch && matchesStatus;
    });

    const totalDepts = departments.length;
    const activeDepts = departments.filter(d => d.isActive).length;
    const inactiveDepts = totalDepts - activeDepts;

    if (loading) return <AdminDepartmentsSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Manage Departments" description="Admin management for UC Main campus colleges and departments." />

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 d-flex align-items-center">
                        <FaBuildingColumns className="me-2 text-primary" /> Campus Departments
                    </h2>
                    <p className="text-muted mb-0">
                        Configure dynamic colleges and departments for student registrations, event scopes, and system categorization.
                    </p>
                </div>
                <button
                    className="btn btn-primary d-flex align-items-center gap-2 px-3 py-2 fw-semibold shadow-sm"
                    onClick={() => setShowCreateModal(true)}
                >
                    <FaPlus /> Add Department
                </button>
            </div>

            {/* Quick Stats Metric Cards */}
            <div className="row g-3 mb-4">
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-semibold text-uppercase">Total Departments</span>
                                <h3 className="fw-bold mb-0 text-dark mt-1">{totalDepts}</h3>
                            </div>
                            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                <FaBuildingColumns size={24} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-semibold text-uppercase">Active in Registration</span>
                                <h3 className="fw-bold mb-0 text-success mt-1">{activeDepts}</h3>
                            </div>
                            <div className="p-3 bg-success bg-opacity-10 text-success rounded-4">
                                <FaCircleCheck size={24} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-md-4">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-semibold text-uppercase">Inactive / Archived</span>
                                <h3 className="fw-bold mb-0 text-secondary mt-1">{inactiveDepts}</h3>
                            </div>
                            <div className="p-3 bg-secondary bg-opacity-10 text-secondary rounded-4">
                                <FaCircleXmark size={24} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Search & Filter Toolbar */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
                <div className="row g-3 align-items-center">
                    <div className="col-md-8">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-0"><FaMagnifyingGlass className="text-muted" /></span>
                            <input
                                type="text"
                                className="form-control bg-light border-0"
                                placeholder="Search departments..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-4">
                        <select
                            className="form-select bg-light border-0"
                            value={statusFilter}
                            onChange={e => setStatusFilter(e.target.value)}
                        >
                            <option value="ALL">All Statuses</option>
                            <option value="ACTIVE">Active Only</option>
                            <option value="INACTIVE">Inactive Only</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Departments Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="ps-4">Code</th>
                                <th>Department Name</th>
                                <th>Description</th>
                                <th>Theme Color</th>
                                <th>Registration Status</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredDepartments.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="text-center py-5 text-muted">
                                        <FaBuildingColumns size={40} className="mb-2 opacity-50" />
                                        <p className="mb-0">No departments found matching your criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredDepartments.map(dept => (
                                    <tr key={dept._id}>
                                        <td className="ps-4">
                                            <span
                                                className="badge px-3 py-2 fw-bold text-white rounded-pill"
                                                style={{ backgroundColor: dept.color || '#003399', fontSize: '0.85rem' }}
                                            >
                                                {dept.code}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="fw-semibold text-dark">{dept.name}</div>
                                        </td>
                                        <td>
                                            <span className="text-muted small">
                                                {dept.description || '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="d-flex align-items-center gap-2">
                                                <div
                                                    className="rounded-circle shadow-sm"
                                                    style={{
                                                        width: '20px',
                                                        height: '20px',
                                                        backgroundColor: dept.color || '#003399',
                                                        border: '2px solid #fff'
                                                    }}
                                                ></div>
                                                <code className="text-muted small">{dept.color || '#003399'}</code>
                                            </div>
                                        </td>
                                        <td>
                                            <button
                                                className={`btn btn-sm rounded-pill px-3 fw-semibold d-inline-flex align-items-center gap-1 ${dept.isActive ? 'btn-success bg-opacity-10 text-success border-success' : 'btn-secondary bg-opacity-10 text-secondary border-secondary'}`}
                                                onClick={() => handleToggleStatus(dept)}
                                                title="Click to toggle availability"
                                            >
                                                {dept.isActive ? (
                                                    <><FaCircleCheck size={12} /> Active</>
                                                ) : (
                                                    <><FaCircleXmark size={12} /> Inactive</>
                                                )}
                                            </button>
                                        </td>
                                        <td className="text-end pe-4">
                                            <div className="btn-group">
                                                <button
                                                    className="btn btn-sm btn-outline-primary"
                                                    onClick={() => openEdit(dept)}
                                                    title="Edit Department"
                                                >
                                                    <FaPencil />
                                                </button>
                                                <button
                                                    className="btn btn-sm btn-outline-danger"
                                                    onClick={() => openDelete(dept)}
                                                    title="Delete Department"
                                                >
                                                    <FaTrash />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* CREATE DEPARTMENT MODAL */}
            {showCreateModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-primary text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center">
                                    <FaBuildingColumns className="me-2" /> Add New Department
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreateModal(false)}></button>
                            </div>
                            <form onSubmit={handleCreate}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Department Code *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Department code"
                                            required
                                            value={createForm.code}
                                            onChange={e => setCreateForm({ ...createForm, code: e.target.value.toUpperCase() })}
                                            autoFocus
                                        />
                                        <div className="form-text">Short unique code (e.g. CCS, CBA, CAS, CEA).</div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Department Name *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Department name"
                                            required
                                            value={createForm.name}
                                            onChange={e => setCreateForm({ ...createForm, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Description</label>
                                        <textarea
                                            className="form-control"
                                            rows="2"
                                            placeholder="Description"
                                            value={createForm.description}
                                            onChange={e => setCreateForm({ ...createForm, description: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold d-flex align-items-center">
                                            <FaPalette className="me-2 text-muted" /> Theme Color
                                        </label>
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <input
                                                type="color"
                                                className="form-control form-control-color"
                                                value={createForm.color}
                                                onChange={e => setCreateForm({ ...createForm, color: e.target.value })}
                                                title="Choose color"
                                            />
                                            <span className="fw-mono small text-muted">{createForm.color}</span>
                                        </div>
                                        <div className="d-flex flex-wrap gap-1">
                                            {COLOR_PRESETS.map(p => (
                                                <button
                                                    key={p.color}
                                                    type="button"
                                                    className="btn btn-sm rounded-circle p-0"
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        backgroundColor: p.color,
                                                        border: createForm.color === p.color ? '2px solid #000' : '1px solid #ddd'
                                                    }}
                                                    onClick={() => setCreateForm({ ...createForm, color: p.color })}
                                                    title={p.label}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-check form-switch mt-3">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="createIsActive"
                                            checked={createForm.isActive}
                                            onChange={e => setCreateForm({ ...createForm, isActive: e.target.checked })}
                                        />
                                        <label className="form-check-label fw-semibold" htmlFor="createIsActive">
                                            Active (Available in registration and events)
                                        </label>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light rounded-bottom-4">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary" disabled={submitting}>
                                        {submitting ? 'Creating...' : 'Create Department'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* EDIT DEPARTMENT MODAL */}
            {showEditModal && editData && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-warning text-dark rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center">
                                    <FaPencil className="me-2" /> Edit Department ({editData.code})
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Department Code *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Department code"
                                            required
                                            value={editData.code}
                                            onChange={e => setEditData({ ...editData, code: e.target.value.toUpperCase() })}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Department Name *</label>
                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Department name"
                                            required
                                            value={editData.name}
                                            onChange={e => setEditData({ ...editData, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Description</label>
                                        <textarea
                                            className="form-control"
                                            rows="2"
                                            placeholder="Description"
                                            value={editData.description}
                                            onChange={e => setEditData({ ...editData, description: e.target.value })}
                                        ></textarea>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold d-flex align-items-center">
                                            <FaPalette className="me-2 text-muted" /> Theme Color
                                        </label>
                                        <div className="d-flex align-items-center gap-2 mb-2">
                                            <input
                                                type="color"
                                                className="form-control form-control-color"
                                                value={editData.color}
                                                onChange={e => setEditData({ ...editData, color: e.target.value })}
                                                title="Choose color"
                                            />
                                            <span className="fw-mono small text-muted">{editData.color}</span>
                                        </div>
                                        <div className="d-flex flex-wrap gap-1">
                                            {COLOR_PRESETS.map(p => (
                                                <button
                                                    key={p.color}
                                                    type="button"
                                                    className="btn btn-sm rounded-circle p-0"
                                                    style={{
                                                        width: '24px',
                                                        height: '24px',
                                                        backgroundColor: p.color,
                                                        border: editData.color === p.color ? '2px solid #000' : '1px solid #ddd'
                                                    }}
                                                    onClick={() => setEditData({ ...editData, color: p.color })}
                                                    title={p.label}
                                                />
                                            ))}
                                        </div>
                                    </div>

                                    <div className="form-check form-switch mt-3">
                                        <input
                                            className="form-check-input"
                                            type="checkbox"
                                            id="editIsActive"
                                            checked={editData.isActive}
                                            onChange={e => setEditData({ ...editData, isActive: e.target.checked })}
                                        />
                                        <label className="form-check-label fw-semibold" htmlFor="editIsActive">
                                            Active (Available in registration and events)
                                        </label>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light rounded-bottom-4">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-warning fw-semibold" disabled={submitting}>
                                        {submitting ? 'Updating...' : 'Update Department'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE CONFIRMATION MODAL */}
            {showDeleteModal && deleteTarget && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-danger text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center">
                                    <FaTrash className="me-2" /> Delete Department
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDeleteModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p>Are you sure you want to delete the department <strong>{deleteTarget.code} - {deleteTarget.name}</strong>?</p>
                                <div className="alert alert-warning small mb-0">
                                    <strong>Notice:</strong> This will permanently remove the department from the database. Existing users with this department will retain their department tag.
                                </div>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDeleteModal(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
                                    {submitting ? 'Deleting...' : 'Confirm Delete'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminDepartments;
