import React, { useState, useEffect, useCallback } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import StudentProfileSkeleton from '../../components/skeletons/StudentProfileSkeleton';
import {
    FaUser, FaPencil, FaShirt, FaEye, FaEyeSlash,
    FaKey, FaCopy, FaBook, FaGraduationCap, FaCalendarDays,
    FaLocationDot, FaIdCard, FaCircleCheck
} from 'react-icons/fa6';

const StudentProfile = () => {
    const { user, syncSession } = useAuth();
    const [orders, setOrders] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', password: '', image: null });
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);
    const [saving, setSaving] = useState(false);

    const loadActivity = useCallback(async () => {
        try {
            const results = await Promise.allSettled([
                API.getOrders(),
                API.getEvents(),
                API.getDepartments()
            ]);
            if (results[0].status === 'fulfilled' && Array.isArray(results[0].value)) setOrders(results[0].value);
            if (results[1].status === 'fulfilled' && Array.isArray(results[1].value)) {
                const rsvpd = results[1].value.filter(e => e.attendees && e.attendees.includes(user?._id));
                setMyEvents(rsvpd);
            }
            if (results[2].status === 'fulfilled' && Array.isArray(results[2].value)) {
                setDepartments(results[2].value);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setLoading(false), 400);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            setEditForm({
                firstName: user.firstName || (user.name ? user.name.split(' ')[0] : ''),
                lastName: user.lastName || (user.name ? user.name.split(' ').pop() : ''),
                password: '',
                image: null
            });
            if (user.apiKey) setApiKey(user.apiKey);
            loadActivity();
        }
    }, [user, loadActivity]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true);
        try {
            const formData = new FormData();
            formData.append('firstName', editForm.firstName);
            formData.append('lastName', editForm.lastName);
            if (editForm.password) formData.append('password', editForm.password);
            if (editForm.image) formData.append('image', editForm.image);

            await API.updateProfile(formData);
            await syncSession();
            toast.success("Profile updated successfully");
            setShowEdit(false);
        } catch (e) {
            toast.error(e.message || "Update failed");
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateApiKey = async () => {
        try {
            const res = await API.generateApiKey();
            setApiKey(res.apiKey);
            toast.success("API Key generated successfully");
        } catch (e) {
            toast.error(e.message || "Failed to generate API Key");
        }
    };

    const copyToClipboard = () => {
        if (!apiKey) return;
        navigator.clipboard.writeText(apiKey);
        toast.success("API Key copied to clipboard");
    };

    const getInitials = () => {
        if (!user) return 'U';
        const f = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : '');
        const l = user.lastName ? user.lastName.charAt(0) : (user.name && user.name.includes(' ') ? user.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase() || 'U';
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    if (loading) return <StudentProfileSkeleton />;
    if (!user) return null;

    const studentName = (user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : (user.name || 'Student');
    const deptObj = departments.find(d => d.code === user.department);

    return (
        <div className="container-fluid py-4">
            <SEO title="Student Profile" description="Manage your student identification, activity, and developer settings." />

            <div className="row g-4">
                {/* Left Column: Student Identity Card */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 bg-white text-center overflow-hidden mb-4">
                        <div className="p-4" style={{ backgroundColor: deptObj?.color || '#003399', color: '#fff' }}>
                            <div className="position-relative d-inline-block mb-3">
                                {user.profileImage ? (
                                    <img
                                        src={user.profileImage}
                                        className="rounded-circle border border-3 border-white object-fit-cover shadow"
                                        style={{ width: '110px', height: '110px' }}
                                        alt={studentName}
                                    />
                                ) : (
                                    <div
                                        className="rounded-circle border border-3 border-white d-flex align-items-center justify-content-center bg-white text-primary fw-bold mx-auto shadow"
                                        style={{ width: '110px', height: '110px', fontSize: '38px' }}
                                    >
                                        {getInitials()}
                                    </div>
                                )}
                            </div>
                            <h4 className="fw-bold mb-1">{studentName}</h4>
                            <span className="badge bg-white text-dark rounded-pill px-3 py-1 fw-bold text-uppercase">
                                {user.role === 'admin' ? 'Campus Admin' : 'Student'}
                            </span>
                        </div>

                        <div className="card-body p-4 text-start">
                            <ul className="list-group list-group-flush mb-3">
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                    <span className="text-muted small">Student ID</span>
                                    <span className="fw-mono fw-bold text-dark">{user.studentId || '—'}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                    <span className="text-muted small">Department</span>
                                    <span className="badge text-white px-2 py-1 rounded-pill" style={{ backgroundColor: deptObj?.color || '#003399' }}>
                                        {user.department || 'General'}
                                    </span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                    <span className="text-muted small">Program</span>
                                    <span className="fw-semibold text-dark">{user.program || 'N/A'}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                    <span className="text-muted small">Year Level</span>
                                    <span className="fw-semibold text-dark">{user.year ? `Year ${user.year}` : '1st Year'}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                    <span className="text-muted small">Email Address</span>
                                    <span className="text-secondary small">{user.email}</span>
                                </li>
                            </ul>

                            <button
                                className="btn btn-outline-primary w-100 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-2 mb-3"
                                onClick={() => setShowEdit(true)}
                            >
                                <FaPencil size={12} /> Edit Profile & Security
                            </button>
                        </div>
                    </div>

                    {/* Developer & API Console Card */}
                    <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                        <h6 className="fw-bold text-dark d-flex align-items-center mb-3">
                            <FaKey className="me-2 text-warning" /> Developer & API Access
                        </h6>
                        <label className="form-label small text-muted">Personal API Key</label>
                        <div className="input-group mb-2">
                            <input
                                type={showApiKey ? "text" : "password"}
                                className="form-control form-control-sm bg-light border-0"
                                value={apiKey || ''}
                                readOnly
                                placeholder="No API key generated"
                            />
                            <button className="btn btn-light btn-sm border-0" type="button" onClick={() => setShowApiKey(!showApiKey)}>
                                {showApiKey ? <FaEyeSlash size={14} /> : <FaEye size={14} />}
                            </button>
                            <button className="btn btn-outline-primary btn-sm" type="button" onClick={copyToClipboard} disabled={!apiKey}>
                                <FaCopy size={14} />
                            </button>
                        </div>
                        <button className="btn btn-sm btn-primary rounded-pill w-100 mb-2 fw-semibold" onClick={handleGenerateApiKey}>
                            {apiKey ? 'Regenerate API Key' : 'Generate API Key'}
                        </button>
                        <Link to="/documentation" className="btn btn-sm btn-light border rounded-pill w-100 d-flex align-items-center justify-content-center gap-2 mb-2">
                            <FaBook size={12} /> API Documentation
                        </Link>
                        <Link to="/student/developer" className="btn btn-sm btn-light border rounded-pill w-100 d-flex align-items-center justify-content-center gap-2">
                            <FaKey size={12} /> OAuth Apps Console
                        </Link>
                    </div>
                </div>

                {/* Right Column: Orders & Event Registrations */}
                <div className="col-lg-8">
                    {/* Orders History Card */}
                    <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
                        <h5 className="fw-bold text-dark d-flex align-items-center mb-3">
                            <FaShirt className="me-2 text-primary" /> My Merchandise Orders
                        </h5>
                        {orders.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                                <FaShirt size={32} className="mb-2 opacity-25" />
                                <p className="small mb-0">No merchandise orders placed yet.</p>
                            </div>
                        ) : (
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Date</th>
                                            <th>Items</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {orders.map(o => (
                                            <tr key={o._id}>
                                                <td className="fw-mono fw-bold text-primary small">
                                                    #{o._id.slice(-6).toUpperCase()}
                                                </td>
                                                <td className="text-muted small">
                                                    {new Date(o.createdAt || o.orderDate).toLocaleDateString()}
                                                </td>
                                                <td className="small">
                                                    {o.items.map((i, idx) => (
                                                        <div key={idx} className="text-truncate" style={{ maxWidth: '200px' }}>
                                                            {i.merch?.name || 'Item'} (x{i.quantity})
                                                        </div>
                                                    ))}
                                                </td>
                                                <td className="fw-bold text-dark">{formatCurrency(o.totalPrice)}</td>
                                                <td>
                                                    <span className={`badge rounded-pill px-2 py-1 ${o.status === 'claimed' ? 'bg-success' : o.status === 'pending' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                                                        {o.status?.toUpperCase()}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>

                    {/* RSVP'd Events Card */}
                    <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                        <h5 className="fw-bold text-dark d-flex align-items-center mb-3">
                            <FaCalendarDays className="me-2 text-primary" /> Registered Campus Activities
                        </h5>
                        {myEvents.length === 0 ? (
                            <div className="text-center py-4 text-muted">
                                <FaCalendarDays size={32} className="mb-2 opacity-25" />
                                <p className="small mb-0">You have not registered for any upcoming events.</p>
                            </div>
                        ) : (
                            <div className="row g-3">
                                {myEvents.map(e => (
                                    <div className="col-md-6" key={e._id}>
                                        <div className="card border rounded-3 p-3 bg-light h-100">
                                            <div className="d-flex align-items-center gap-3">
                                                <img
                                                    src={e.image || 'https://via.placeholder.com/60'}
                                                    alt={e.title}
                                                    className="rounded-3 object-fit-cover"
                                                    style={{ width: '60px', height: '60px' }}
                                                />
                                                <div className="flex-grow-1 overflow-hidden">
                                                    <h6 className="fw-bold text-dark text-truncate mb-1">{e.title}</h6>
                                                    <small className="text-muted d-flex align-items-center gap-1 mb-1">
                                                        <FaLocationDot size={10} className="text-danger" /> {e.location || 'Campus'}
                                                    </small>
                                                    <span className="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-2 py-0 small">
                                                        <FaCircleCheck className="me-1" /> Attending
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Edit Profile Modal */}
            {showEdit && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-primary text-white rounded-top-4">
                                <h5 className="modal-title fw-bold">Edit Profile & Settings</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowEdit(false)}></button>
                            </div>
                            <form onSubmit={handleSave}>
                                <div className="modal-body p-4">
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Profile Photo</label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            onChange={e => setEditForm({ ...editForm, image: e.target.files[0] })}
                                        />
                                    </div>
                                    <div className="row mb-3">
                                        <div className="col">
                                            <label className="form-label fw-semibold">First Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={editForm.firstName}
                                                onChange={e => setEditForm({ ...editForm, firstName: e.target.value })}
                                            />
                                        </div>
                                        <div className="col">
                                            <label className="form-label fw-semibold">Last Name</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                required
                                                value={editForm.lastName}
                                                onChange={e => setEditForm({ ...editForm, lastName: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <hr />
                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Update Password (Optional)</label>
                                        <div className="input-group">
                                            <input
                                                className="form-control"
                                                type={showPassword ? 'text' : 'password'}
                                                value={editForm.password}
                                                onChange={e => setEditForm({ ...editForm, password: e.target.value })}
                                                placeholder="Leave blank to keep current"
                                            />
                                            <span className="input-group-text" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light rounded-bottom-4">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEdit(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary fw-semibold" disabled={saving}>
                                        {saving ? 'Saving...' : 'Save Changes'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentProfile;
