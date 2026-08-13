import React, { useState, useEffect, useCallback, useRef } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import StudentProfileSkeleton from '../../components/skeletons/StudentProfileSkeleton';
import PasswordStrength from '../../components/PasswordStrength';
import {
    FaUser, FaPencil, FaShirt, FaEye, FaEyeSlash,
    FaLock, FaCheck, FaXmark, FaCalendarDays,
    FaLocationDot, FaIdCard, FaCircleCheck, FaGraduationCap,
    FaEnvelope, FaBuildingColumns, FaShieldHalved, FaBell,
    FaMobileScreenButton, FaCamera, FaTrash
} from 'react-icons/fa6';

const StudentProfile = () => {
    const { user, syncSession } = useAuth();
    const {
        devicePermission,
        requestDeviceNotificationPermission,
        sendTestDeviceNotification
    } = useSocket();

    const [orders, setOrders] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);

    // Email Editing State
    const [isEditingEmail, setIsEditingEmail] = useState(false);
    const [emailInput, setEmailInput] = useState('');
    const [savingEmail, setSavingEmail] = useState(false);

    // Password Security State
    const [showPasswordSection, setShowPasswordSection] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ newPassword: '', confirmPassword: '' });
    const [showNewPass, setShowNewPass] = useState(false);
    const [showConfirmPass, setShowConfirmPass] = useState(false);
    const [savingPassword, setSavingPassword] = useState(false);

    // Notification Preferences State
    const [notifPrefs, setNotifPrefs] = useState({ email: true, app: true });
    const [savingNotif, setSavingNotif] = useState(false);

    // Profile Photo Upload State
    const [uploadingPhoto, setUploadingPhoto] = useState(false);
    const fileInputRef = useRef(null);

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
            setTimeout(() => setLoading(false), 350);
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            setEmailInput(user.email || '');
            if (user.notificationPreferences) {
                setNotifPrefs({
                    email: user.notificationPreferences.email !== false,
                    app: user.notificationPreferences.app !== false
                });
            }
            loadActivity();
        }
    }, [user, loadActivity]);

    // Handle Email Update
    const handleSaveEmail = async (e) => {
        if (e) e.preventDefault();
        const trimmedEmail = emailInput.trim().toLowerCase();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!trimmedEmail || !emailRegex.test(trimmedEmail)) {
            return toast.error("Please enter a valid email address.");
        }

        if (trimmedEmail === user.email?.toLowerCase()) {
            setIsEditingEmail(false);
            return;
        }

        setSavingEmail(true);
        try {
            await API.updateProfile({ email: trimmedEmail });
            await syncSession();
            toast.success("Email address updated successfully!");
            setIsEditingEmail(false);
        } catch (err) {
            toast.error(err.message || "Failed to update email address.");
        } finally {
            setSavingEmail(false);
        }
    };

    // Handle Password Update
    const handleSavePassword = async (e) => {
        if (e) e.preventDefault();
        if (passwordForm.newPassword !== passwordForm.confirmPassword) {
            return toast.error("Passwords do not match.");
        }

        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passRegex.test(passwordForm.newPassword)) {
            return toast.error("Password must be at least 8 characters long and include an uppercase letter, a lowercase letter, a number, and a special character.");
        }

        setSavingPassword(true);
        try {
            await API.updateProfile({ password: passwordForm.newPassword });
            toast.success("Password changed successfully!");
            setPasswordForm({ newPassword: '', confirmPassword: '' });
            setShowPasswordSection(false);
        } catch (err) {
            toast.error(err.message || "Failed to change password.");
        } finally {
            setSavingPassword(false);
        }
    };

    // Handle Photo Upload
    const handlePhotoChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            return toast.error("Please select a valid image file.");
        }

        if (file.size > 5 * 1024 * 1024) {
            return toast.error("Image file size must be less than 5MB.");
        }

        setUploadingPhoto(true);
        try {
            const formData = new FormData();
            formData.append('image', file);
            await API.updateProfile(formData);
            await syncSession();
            toast.success("Profile photo updated successfully!");
        } catch (err) {
            toast.error(err.message || "Failed to upload photo.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Handle Remove Photo
    const handleRemovePhoto = async () => {
        if (!window.confirm("Remove profile photo?")) return;
        setUploadingPhoto(true);
        try {
            await API.updateProfile({ removeImage: true });
            await syncSession();
            toast.success("Profile photo removed.");
        } catch (err) {
            toast.error(err.message || "Failed to remove photo.");
        } finally {
            setUploadingPhoto(false);
        }
    };

    // Handle Device Push Notification Toggle
    const handleDeviceNotificationToggle = async () => {
        if (!notifPrefs.app) {
            // Turning ON -> request real browser/device permission
            const perm = await requestDeviceNotificationPermission();
            if (perm === 'granted') {
                const updatedPrefs = { ...notifPrefs, app: true };
                setNotifPrefs(updatedPrefs);
                await saveNotificationPreferences(updatedPrefs);
                toast.success("Device notifications enabled!");
            } else if (perm === 'denied') {
                toast.error("Notification permission was denied in your browser settings. Please enable notifications in your browser/device permissions.");
            }
        } else {
            // Turning OFF
            const updatedPrefs = { ...notifPrefs, app: false };
            setNotifPrefs(updatedPrefs);
            await saveNotificationPreferences(updatedPrefs);
            toast.info("Device notifications disabled.");
        }
    };

    // Handle Email Notifications Toggle
    const handleEmailNotificationToggle = async () => {
        const updatedPrefs = { ...notifPrefs, email: !notifPrefs.email };
        setNotifPrefs(updatedPrefs);
        await saveNotificationPreferences(updatedPrefs);
        toast.info(updatedPrefs.email ? "Email announcements enabled." : "Email announcements muted.");
    };

    const saveNotificationPreferences = async (prefs) => {
        setSavingNotif(true);
        try {
            await API.updateProfile({ notificationPreferences: prefs });
            await syncSession();
        } catch (e) {
            console.error("Failed to save notification preferences", e);
        } finally {
            setSavingNotif(false);
        }
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
            <SEO title="Student Profile & Records" description="Official academic identification, account security, and campus records." />

            <div className="row g-4">
                {/* Left Column: Student Identity & Profile Controls */}
                <div className="col-lg-5 col-xl-4">
                    {/* Official Campus Identification Card */}
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

                                {/* Photo Upload Badge Button */}
                                <button
                                    className="btn btn-sm btn-light rounded-circle shadow position-absolute bottom-0 end-0 p-2 d-flex align-items-center justify-content-center"
                                    style={{ width: '34px', height: '34px' }}
                                    title="Update Photo"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={uploadingPhoto}
                                >
                                    <FaCamera size={14} className="text-primary" />
                                </button>
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    className="d-none"
                                    accept="image/*"
                                    onChange={handlePhotoChange}
                                />
                            </div>

                            <h4 className="fw-bold mb-1">{studentName}</h4>
                            <div className="d-flex justify-content-center gap-2 align-items-center">
                                <span className="badge bg-white text-dark rounded-pill px-3 py-1 fw-bold text-uppercase">
                                    {user.role === 'admin' ? 'Campus Administrator' : 'Enrolled Student'}
                                </span>
                                {user.profileImage && (
                                    <button
                                        className="btn btn-sm btn-outline-light border-0 py-0 px-2 small opacity-75 hover-opacity-100"
                                        onClick={handleRemovePhoto}
                                        title="Remove photo"
                                    >
                                        <FaTrash size={11} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Official Academic Records List (Locked) */}
                        <div className="card-body p-4 text-start">
                            <div className="d-flex align-items-center justify-content-between mb-3">
                                <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                    <FaIdCard className="text-primary" /> Official University Records
                                </h6>
                                <span className="badge bg-secondary bg-opacity-10 text-secondary border border-secondary rounded-pill px-2.5 py-1 small d-inline-flex align-items-center gap-1.5">
                                    <FaLock size={10} /> Locked
                                </span>
                            </div>

                            <ul className="list-group list-group-flush mb-3">
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                                    <span className="text-muted small">Student ID Number</span>
                                    <span className="fw-mono fw-bold text-dark">{user.studentId || '—'}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                                    <span className="text-muted small">First Name</span>
                                    <span className="fw-semibold text-dark">{user.firstName || '—'}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                                    <span className="text-muted small">Last Name</span>
                                    <span className="fw-semibold text-dark">{user.lastName || '—'}</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                                    <span className="text-muted small">College Department</span>
                                    <span className="badge text-white px-2.5 py-1 rounded-pill" style={{ backgroundColor: deptObj?.color || '#003399' }}>
                                        {user.department || 'General'}
                                    </span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2 border-bottom">
                                    <span className="text-muted small">Degree Program</span>
                                    <span className="fw-semibold text-dark text-truncate" style={{ maxWidth: '170px' }}>
                                        {user.program || 'N/A'}
                                    </span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-2">
                                    <span className="text-muted small">Year Level</span>
                                    <span className="badge bg-light text-dark border px-2.5 py-1 fw-bold">
                                        {user.year ? `Year ${user.year}` : '1st Year'}
                                    </span>
                                </li>
                            </ul>

                            <div className="alert alert-light border rounded-3 p-2.5 small text-muted d-flex align-items-start gap-2 mb-0">
                                <FaLock className="text-secondary mt-1 flex-shrink-0" size={12} />
                                <span style={{ fontSize: '0.75rem' }}>
                                    Official student records are managed by the University Registrar. Contact campus administration to request name or program corrections.
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Cross-Device Push Notification Settings */}
                    <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <h6 className="fw-bold text-dark mb-0 d-flex align-items-center gap-2">
                                <FaBell className="text-warning" /> Device Notifications
                            </h6>
                            <span className={`badge rounded-pill px-2.5 py-1 small ${
                                devicePermission === 'granted' ? 'bg-success bg-opacity-10 text-success border border-success' :
                                devicePermission === 'denied' ? 'bg-danger bg-opacity-10 text-danger border border-danger' :
                                'bg-warning bg-opacity-10 text-dark border border-warning'
                            }`}>
                                {devicePermission === 'granted' ? 'Permission: Active' :
                                 devicePermission === 'denied' ? 'Permission: Blocked' : 'Permission: Default'}
                            </span>
                        </div>

                        <p className="text-muted small mb-3">
                            Receive real-time campus alerts, announcement broadcasts, and activity updates directly on your computer, laptop, or phone.
                        </p>

                        <div className="list-group list-group-flush mb-3">
                            {/* Native Device Push Toggle */}
                            <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-2.5 border-bottom">
                                <div className="d-flex align-items-center gap-2.5">
                                    <FaMobileScreenButton className="text-primary" />
                                    <div>
                                        <div className="fw-semibold small text-dark">Native Device Push</div>
                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Desktop & mobile alerts</small>
                                    </div>
                                </div>
                                <div className="form-check form-switch mb-0">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        checked={notifPrefs.app && devicePermission === 'granted'}
                                        onChange={handleDeviceNotificationToggle}
                                        disabled={savingNotif}
                                    />
                                </div>
                            </div>

                            {/* Email Broadcast Alerts */}
                            <div className="list-group-item d-flex justify-content-between align-items-center px-0 py-2.5">
                                <div className="d-flex align-items-center gap-2.5">
                                    <FaEnvelope className="text-primary" />
                                    <div>
                                        <div className="fw-semibold small text-dark">Email Broadcasts</div>
                                        <small className="text-muted" style={{ fontSize: '0.75rem' }}>Announcements to your inbox</small>
                                    </div>
                                </div>
                                <div className="form-check form-switch mb-0">
                                    <input
                                        className="form-check-input"
                                        type="checkbox"
                                        role="switch"
                                        checked={notifPrefs.email}
                                        onChange={handleEmailNotificationToggle}
                                        disabled={savingNotif}
                                    />
                                </div>
                            </div>
                        </div>

                        {devicePermission === 'granted' && (
                            <button
                                className="btn btn-sm btn-outline-primary w-100 rounded-pill fw-semibold d-flex align-items-center justify-content-center gap-2 py-2"
                                onClick={sendTestDeviceNotification}
                            >
                                <FaBell /> Send Test Notification to this Device
                            </button>
                        )}

                        {devicePermission === 'denied' && (
                            <div className="alert alert-warning border-0 p-2 small mb-0 rounded-3" style={{ fontSize: '0.75rem' }}>
                                Notifications are blocked by your browser. Click the site settings icon next to the URL bar to allow notifications.
                            </div>
                        )}
                    </div>
                </div>

                {/* Right Column: Editable Account Details & Activity */}
                <div className="col-lg-7 col-xl-8">
                    {/* Editable Student Information (Email & Credentials) */}
                    <div className="card border-0 shadow-sm rounded-4 bg-white p-4 mb-4">
                        <div className="d-flex align-items-center justify-content-between mb-3">
                            <div>
                                <h5 className="fw-bold text-dark mb-1 d-flex align-items-center">
                                    <FaEnvelope className="me-2 text-primary" /> Contact & Account Credentials
                                </h5>
                                <small className="text-muted">Manage your editable account address and password security.</small>
                            </div>
                        </div>

                        {/* Email Management Section */}
                        <div className="bg-light rounded-4 p-3 mb-3 border">
                            <div className="d-flex justify-content-between align-items-center mb-2">
                                <label className="form-label fw-bold text-dark mb-0 small">
                                    Registered Email Address
                                </label>
                                {!isEditingEmail ? (
                                    <button
                                        className="btn btn-sm btn-outline-primary rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                                        onClick={() => setIsEditingEmail(true)}
                                    >
                                        <FaPencil size={11} /> Edit Email
                                    </button>
                                ) : (
                                    <button
                                        className="btn btn-sm btn-outline-secondary rounded-pill px-3 py-1 d-flex align-items-center gap-1"
                                        onClick={() => {
                                            setIsEditingEmail(false);
                                            setEmailInput(user.email || '');
                                        }}
                                        disabled={savingEmail}
                                    >
                                        <FaXmark size={11} /> Cancel
                                    </button>
                                )}
                            </div>

                            {!isEditingEmail ? (
                                <div className="d-flex align-items-center justify-content-between">
                                    <span className="fw-semibold text-dark">{user.email}</span>
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success rounded-pill px-2 py-1 small">
                                        <FaCheck className="me-1" /> Active
                                    </span>
                                </div>
                            ) : (
                                <form onSubmit={handleSaveEmail}>
                                    <div className="input-group mb-2">
                                        <input
                                            type="email"
                                            className="form-control bg-white"
                                            placeholder="New email address"
                                            value={emailInput}
                                            onChange={(e) => setEmailInput(e.target.value)}
                                            required
                                            autoFocus
                                        />
                                        <button
                                            type="submit"
                                            className="btn btn-primary fw-semibold px-4"
                                            disabled={savingEmail}
                                        >
                                            {savingEmail ? 'Saving...' : 'Save Email'}
                                        </button>
                                    </div>
                                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                                        Make sure you have access to this email. It is used for password recovery and notifications.
                                    </small>
                                </form>
                            )}
                        </div>

                        {/* Password Security Accordion / Section */}
                        <div className="border rounded-4 p-3 bg-light">
                            <div className="d-flex justify-content-between align-items-center">
                                <div className="d-flex align-items-center gap-2">
                                    <FaShieldHalved className="text-primary" />
                                    <div>
                                        <div className="fw-bold small text-dark">Password & Security</div>
                                        <small className="text-muted">Update your account password</small>
                                    </div>
                                </div>
                                <button
                                    className="btn btn-sm btn-outline-primary rounded-pill px-3"
                                    onClick={() => setShowPasswordSection(!showPasswordSection)}
                                >
                                    {showPasswordSection ? 'Close' : 'Change Password'}
                                </button>
                            </div>

                            {showPasswordSection && (
                                <form onSubmit={handleSavePassword} className="mt-3 pt-3 border-top">
                                    <div className="row g-3 mb-3">
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold small">New Password</label>
                                            <div className="input-group">
                                                <input
                                                    type={showNewPass ? "text" : "password"}
                                                    className="form-control bg-white"
                                                    placeholder="New password"
                                                    value={passwordForm.newPassword}
                                                    onChange={e => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary"
                                                    onClick={() => setShowNewPass(!showNewPass)}
                                                >
                                                    {showNewPass ? <FaEyeSlash /> : <FaEye />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="col-md-6">
                                            <label className="form-label fw-semibold small">Confirm New Password</label>
                                            <div className="input-group">
                                                <input
                                                    type={showConfirmPass ? "text" : "password"}
                                                    className="form-control bg-white"
                                                    placeholder="Confirm password"
                                                    value={passwordForm.confirmPassword}
                                                    onChange={e => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                                                    required
                                                />
                                                <button
                                                    type="button"
                                                    className="btn btn-outline-secondary"
                                                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                                                >
                                                    {showConfirmPass ? <FaEyeSlash /> : <FaEye />}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Password Strength Component */}
                                    {passwordForm.newPassword && (
                                        <div className="mb-3">
                                            <PasswordStrength password={passwordForm.newPassword} />
                                        </div>
                                    )}

                                    <div className="d-flex justify-content-end gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-sm btn-light border rounded-pill px-3"
                                            onClick={() => setShowPasswordSection(false)}
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="submit"
                                            className="btn btn-sm btn-primary rounded-pill px-4 fw-semibold"
                                            disabled={savingPassword}
                                        >
                                            {savingPassword ? 'Updating...' : 'Update Password'}
                                        </button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </div>

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
        </div>
    );
};

export default StudentProfile;
