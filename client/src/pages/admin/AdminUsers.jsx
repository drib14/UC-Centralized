import React, { useEffect, useState } from 'react';
import AdminUsersSkeleton from '../../components/skeletons/AdminUsersSkeleton';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import {
    FaUsers, FaMagnifyingGlass, FaPencil, FaTrash, FaUserShield,
    FaGraduationCap, FaDownload, FaCircle, FaUserCheck
} from 'react-icons/fa6';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [roleFilter, setRoleFilter] = useState('ALL');
    const [deptFilter, setDeptFilter] = useState('ALL');

    // Edit Modal State
    const [editData, setEditData] = useState(null);
    const [showEdit, setShowEdit] = useState(false);

    // Delete Modal State
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [showDelete, setShowDelete] = useState(false);

    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        loadUsers();
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

    const loadUsers = async () => {
        try {
            setLoading(true);
            const data = await API.getUsers();
            setUsers(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Failed to load users");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdate = async (e) => {
        if (e) e.preventDefault();
        if (!editData.firstName.trim() || !editData.lastName.trim()) {
            toast.error("First Name and Last Name are required");
            return;
        }

        setSubmitting(true);
        try {
            const payload = {
                role: editData.role,
                firstName: editData.firstName.trim(),
                lastName: editData.lastName.trim(),
                department: editData.department,
                program: editData.program || '',
                year: editData.year || '1'
            };
            await API.updateUser(editData._id, payload);
            toast.success("User profile updated successfully");
            setShowEdit(false);
            setEditData(null);
            loadUsers();
        } catch (e) {
            toast.error(e.message || "Failed to update user");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            await API.deleteUser(deleteTarget._id);
            toast.success(`User ${deleteTarget.studentId || deleteTarget.email} deleted`);
            setShowDelete(false);
            setDeleteTarget(null);
            setUsers(users.filter(u => u._id !== deleteTarget._id));
        } catch (e) {
            toast.error("Failed to delete user");
        } finally {
            setSubmitting(false);
        }
    };

    // Export Users to CSV
    const exportUsersCSV = () => {
        if (users.length === 0) return toast.info("No users to export");
        const headers = ["ID", "First Name", "Last Name", "Email", "Role", "Department", "Program", "Year"];
        const rows = users.map(u => [
            u.studentId || '',
            u.firstName || '',
            u.lastName || '',
            u.email || '',
            u.role || '',
            u.department || '',
            u.program || '',
            u.year || ''
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `UC_Users_Export_${new Date().toISOString().slice(0,10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success("Users exported to CSV");
    };

    // Filter Logic
    const filteredUsers = users.filter(u => {
        const fullName = `${u.firstName || ''} ${u.lastName || ''} ${u.name || ''}`.toLowerCase();
        const matchesSearch =
            fullName.includes(search.toLowerCase()) ||
            (u.studentId && u.studentId.includes(search)) ||
            (u.email && u.email.toLowerCase().includes(search.toLowerCase()));

        const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
        const matchesDept = deptFilter === 'ALL' || u.department === deptFilter;

        return matchesSearch && matchesRole && matchesDept;
    });

    const totalStudents = users.filter(u => u.role === 'student').length;
    const totalAdmins = users.filter(u => u.role === 'admin').length;
    const onlineUsers = users.filter(u => u.isOnline).length;

    if (loading) return <AdminUsersSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="User Management" description="Admin user administration, role assignment, and student records." />

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 d-flex align-items-center fw-bold">
                        <FaUsers className="me-2 text-primary" /> User Management & Records
                    </h2>
                    <p className="text-muted mb-0">Manage student accounts, academic departments, and administrator roles.</p>
                </div>
                <button className="btn btn-outline-primary d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm" onClick={exportUsersCSV}>
                    <FaDownload /> Export CSV
                </button>
            </div>

            {/* Quick Metric Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Total Accounts</span>
                                <h3 className="fw-bold text-dark mt-1 mb-0">{users.length}</h3>
                            </div>
                            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                <FaUsers size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Students</span>
                                <h3 className="fw-bold text-info mt-1 mb-0">{totalStudents}</h3>
                            </div>
                            <div className="p-3 bg-info bg-opacity-10 text-info rounded-4">
                                <FaGraduationCap size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Administrators</span>
                                <h3 className="fw-bold text-warning mt-1 mb-0">{totalAdmins}</h3>
                            </div>
                            <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-4">
                                <FaUserShield size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Active Online</span>
                                <h3 className="fw-bold text-success mt-1 mb-0">{onlineUsers}</h3>
                            </div>
                            <div className="p-3 bg-success bg-opacity-10 text-success rounded-4">
                                <FaUserCheck size={22} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
                <div className="row g-3">
                    <div className="col-md-6">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-0"><FaMagnifyingGlass className="text-muted" /></span>
                            <input
                                type="text"
                                className="form-control bg-light border-0"
                                placeholder="Search by name, student ID, or email..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-3">
                        <select
                            className="form-select bg-light border-0"
                            value={roleFilter}
                            onChange={e => setRoleFilter(e.target.value)}
                        >
                            <option value="ALL">All Roles</option>
                            <option value="student">Students</option>
                            <option value="admin">Administrators</option>
                        </select>
                    </div>
                    <div className="col-md-3">
                        <select
                            className="form-select bg-light border-0"
                            value={deptFilter}
                            onChange={e => setDeptFilter(e.target.value)}
                        >
                            <option value="ALL">All Departments</option>
                            {departments.map(d => (
                                <option key={d._id || d.code} value={d.code}>{d.code} - {d.name}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Users Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="ps-4">User</th>
                                <th>ID Number</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Department</th>
                                <th>Program & Year</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-5 text-muted">
                                        <FaUsers size={36} className="mb-2 opacity-50" />
                                        <p className="mb-0">No users found matching current filters.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredUsers.map(u => {
                                    const deptObj = departments.find(d => d.code === u.department);
                                    const initials = ((u.firstName ? u.firstName[0] : '') + (u.lastName ? u.lastName[0] : '')).toUpperCase() || 'U';

                                    return (
                                        <tr key={u._id}>
                                            <td className="ps-4">
                                                <div className="d-flex align-items-center gap-3">
                                                    <div className="position-relative">
                                                        {u.profileImage ? (
                                                            <img src={u.profileImage} alt="Avatar" className="rounded-circle object-fit-cover shadow-sm" style={{ width: '42px', height: '42px' }} />
                                                        ) : (
                                                            <div className="rounded-circle bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center shadow-sm" style={{ width: '42px', height: '42px' }}>
                                                                {initials}
                                                            </div>
                                                        )}
                                                        <FaCircle
                                                            className={`position-absolute bottom-0 end-0 rounded-circle ${u.isOnline ? 'text-success' : 'text-secondary opacity-50'}`}
                                                            style={{ fontSize: '10px', backgroundColor: '#fff', borderRadius: '50%' }}
                                                        />
                                                    </div>
                                                    <div>
                                                        <div className="fw-semibold text-dark">
                                                            {(u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.name || 'User')}
                                                        </div>
                                                        <small className="text-muted">{u.role === 'admin' ? 'Campus Admin' : 'Student'}</small>
                                                    </div>
                                                </div>
                                            </td>
                                            <td>
                                                <span className="badge bg-light text-dark border font-monospace px-2 py-1">
                                                    {u.studentId || '—'}
                                                </span>
                                            </td>
                                            <td className="text-secondary small">
                                                {u.email}
                                            </td>
                                            <td>
                                                {u.role === 'admin' ? (
                                                    <span className="badge bg-warning text-dark px-3 py-1 rounded-pill fw-semibold">Admin</span>
                                                ) : (
                                                    <span className="badge bg-info bg-opacity-10 text-info border border-info px-3 py-1 rounded-pill fw-semibold">Student</span>
                                                )}
                                            </td>
                                            <td>
                                                <span
                                                    className="badge px-2 py-1 text-white rounded-pill"
                                                    style={{ backgroundColor: deptObj?.color || '#003399' }}
                                                >
                                                    {u.department || 'N/A'}
                                                </span>
                                            </td>
                                            <td className="small text-muted">
                                                {u.program ? `${u.program} • Year ${u.year || '1'}` : '—'}
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="btn-group">
                                                    <button
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => { setEditData(u); setShowEdit(true); }}
                                                        title="Edit User"
                                                    >
                                                        <FaPencil />
                                                    </button>
                                                    <button
                                                        className="btn btn-sm btn-outline-danger"
                                                        onClick={() => { setDeleteTarget(u); setShowDelete(true); }}
                                                        title="Delete User"
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT USER MODAL */}
            {showEdit && editData && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-warning text-dark rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center fw-bold">
                                    <FaPencil className="me-2" /> Edit User ({editData.studentId || editData.email})
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowEdit(false)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body p-4">
                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label fw-semibold">First Name *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="First name"
                                                required
                                                value={editData.firstName || ''}
                                                onChange={e => setEditData({ ...editData, firstName: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label fw-semibold">Last Name *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Last name"
                                                required
                                                value={editData.lastName || ''}
                                                onChange={e => setEditData({ ...editData, lastName: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Role Authority</label>
                                        <select
                                            className="form-select"
                                            value={editData.role}
                                            onChange={e => setEditData({ ...editData, role: e.target.value })}
                                        >
                                            <option value="student">Student User</option>
                                            <option value="admin">Platform Administrator</option>
                                        </select>
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Academic Department</label>
                                        <select
                                            className="form-select"
                                            value={editData.department}
                                            onChange={e => setEditData({ ...editData, department: e.target.value })}
                                        >
                                            {departments.map(d => (
                                                <option key={d._id || d.code} value={d.code}>{d.code} - {d.name}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="row">
                                        <div className="col-md-8 mb-3">
                                            <label className="form-label fw-semibold">Program</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="BSIT"
                                                value={editData.program || ''}
                                                onChange={e => setEditData({ ...editData, program: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label fw-semibold">Year Level</label>
                                            <select
                                                className="form-select"
                                                value={editData.year || '1'}
                                                onChange={e => setEditData({ ...editData, year: e.target.value })}
                                            >
                                                <option value="1">1st Year</option>
                                                <option value="2">2nd Year</option>
                                                <option value="3">3rd Year</option>
                                                <option value="4">4th Year</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light rounded-bottom-4">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-warning fw-semibold" disabled={submitting}>
                                        {submitting ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE USER MODAL */}
            {showDelete && deleteTarget && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-danger text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center">
                                    <FaTrash className="me-2" /> Confirm Delete User
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDelete(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="mb-0">
                                    Are you sure you want to permanently delete user account <strong>{deleteTarget.firstName} {deleteTarget.lastName} ({deleteTarget.studentId || deleteTarget.email})</strong>?
                                </p>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDelete(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
                                    {submitting ? 'Deleting...' : 'Delete User'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
