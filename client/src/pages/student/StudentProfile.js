import React, { useState, useEffect, useCallback } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaUser, FaPen, FaShoppingCart, FaEye, FaEyeSlash, FaKey, FaCopy } from 'react-icons/fa';
import StudentProfileSkeleton from '../../components/skeletons/StudentProfileSkeleton';

const StudentProfile = () => {
    const { user, syncSession } = useAuth();
    const [orders, setOrders] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showEdit, setShowEdit] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', password: '', image: null });
    const [apiKey, setApiKey] = useState('');
    const [showApiKey, setShowApiKey] = useState(false);

    const loadActivity = useCallback(async () => {
        try {
            // Using Promise.allSettled to avoid one failure blocking the other
            const results = await Promise.allSettled([API.getOrders(), API.getEvents()]);
            if (results[0].status === 'fulfilled') setOrders(results[0].value);
            if (results[1].status === 'fulfilled') {
                const rsvpd = results[1].value.filter(e => e.attendees && e.attendees.includes(user._id));
                setMyEvents(rsvpd);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setTimeout(() => setLoading(false), 800);
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

    const handleSave = async () => {
        try {
            const formData = new FormData();
            formData.append('firstName', editForm.firstName);
            formData.append('lastName', editForm.lastName);
            if (editForm.password) formData.append('password', editForm.password);
            if (editForm.image) formData.append('image', editForm.image);

            await API.updateProfile(formData);
            await syncSession();
            toast.success("Profile updated");
            setShowEdit(false);
        } catch (e) {
            toast.error(e.message || "Update failed");
        }
    };

    const handleGenerateApiKey = async () => {
        try {
            const res = await API.generateApiKey();
            setApiKey(res.apiKey);
            // Update local user context if needed, but API usually doesn't return full user.
            // syncSession() might be overkill if it reloads everything, but let's try just setting local state.
            toast.success("API Key generated successfully");
        } catch (e) {
            toast.error(e.message || "Failed to generate API Key");
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(apiKey);
        toast.success("API Key copied to clipboard");
    };

    const getInitials = () => {
        if (!user) return 'U';
        const f = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : '');
        const l = user.lastName ? user.lastName.charAt(0) : (user.name && user.name.includes(' ') ? user.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase() || 'U';
    };

    // Helper to get all merch images from orders
    const getPurchasedMerch = () => {
        const merchList = [];
        orders.forEach(o => {
            o.items.forEach(i => {
                if (i.merch) merchList.push({ ...i.merch, orderDate: o.createdAt || o.orderDate });
            });
        });
        // Sort by date desc
        return merchList.sort((a,b) => new Date(b.orderDate) - new Date(a.orderDate));
    };

    if (loading) return <StudentProfileSkeleton />;
    if (!user) return null;

    const boughtMerch = getPurchasedMerch();

    return (
        <div className="container-fluid">
            <div className="row">
                <div className="col-lg-4 mb-4">
                    <div className="card text-center h-100">
                        <div className="card-body d-flex flex-column align-items-center justify-content-center">
                             {user.profileImage ? (
                                 <img src={user.profileImage} className="rounded-circle mb-3 border border-4 border-success" style={{width: '120px', height: '120px', objectFit: 'cover'}} alt="Profile" />
                             ) : (
                                 <div className="rounded-circle mb-3 border border-4 border-success d-flex align-items-center justify-content-center bg-light text-success fw-bold mx-auto" style={{width: '120px', height: '120px', fontSize: '40px'}}>
                                     {getInitials()}
                                 </div>
                             )}
                             <h3 className="fw-bold text-success">{user.firstName} {user.lastName}</h3>
                             <p className="text-muted mb-1">{user.role.toUpperCase()}</p>
                             <button className="btn btn-outline-success btn-sm mt-3" onClick={() => setShowEdit(true)}>
                                 <FaPen className="me-2" />Edit Profile
                             </button>
                        </div>
                        <ul className="list-group list-group-flush text-start">
                            <li className="list-group-item"><strong>ID:</strong> {user.studentId}</li>
                            <li className="list-group-item"><strong>Dept:</strong> {user.department || 'N/A'}</li>
                            <li className="list-group-item"><strong>Program:</strong> {user.program || 'N/A'}</li>
                            <li className="list-group-item"><strong>Year:</strong> {user.year || 'N/A'}</li>
                        </ul>
                        <div className="card-footer bg-light">
                             <h6 className="fw-bold text-start"><FaKey className="me-2" />Developer Settings</h6>
                             <div className="text-start">
                                 <label className="form-label small">API Key</label>
                                 <div className="input-group mb-2">
                                     <input
                                         type={showApiKey ? "text" : "password"}
                                         className="form-control form-control-sm"
                                         value={apiKey || ''}
                                         readOnly
                                         placeholder="No API Key generated"
                                     />
                                     <button className="btn btn-outline-secondary btn-sm" type="button" onClick={() => setShowApiKey(!showApiKey)}>
                                         {showApiKey ? <FaEyeSlash /> : <FaEye />}
                                     </button>
                                     <button className="btn btn-outline-primary btn-sm" type="button" onClick={copyToClipboard} disabled={!apiKey}>
                                         <FaCopy />
                                     </button>
                                 </div>
                                 <button className="btn btn-sm btn-primary w-100" onClick={handleGenerateApiKey}>
                                     {apiKey ? 'Regenerate Key' : 'Generate Key'}
                                 </button>
                             </div>
                        </div>
                    </div>
                </div>

                <div className="col-lg-8">
                    {/* Merch History */}
                    <div className="card mb-4">
                        <div className="card-header bg-success text-white"><FaShoppingCart className="me-2" />Recently Bought Merch</div>
                        <div className="card-body">
                            {boughtMerch.length === 0 ? <p className="text-center text-muted">No merch purchased yet.</p> : (
                                <div className="d-flex overflow-auto pb-2" style={{gap: '15px'}}>
                                    {boughtMerch.map((item, idx) => (
                                        <div key={idx} className="text-center" style={{minWidth: '100px'}}>
                                            <div className="border rounded p-1 mb-2">
                                                <img src={item.image || 'https://via.placeholder.com/80'}
                                                     alt={item.name}
                                                     style={{width:'80px', height:'80px', objectFit:'cover'}}
                                                     className="rounded" />
                                            </div>
                                            <small className="d-block text-truncate" style={{maxWidth: '100px'}} title={item.name}>{item.name}</small>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Events History */}
                    <div className="card">
                         <div className="card-header bg-primary text-white"><FaUser className="me-2" />My Events</div>
                         <div className="card-body p-0">
                             <div className="list-group list-group-flush">
                                 {myEvents.length === 0 ? <p className="text-center p-3 text-muted">No RSVP'd events.</p> : myEvents.map(e => (
                                     <div className="list-group-item" key={e._id}>
                                         <div className="d-flex align-items-center">
                                             <img src={e.image || 'https://via.placeholder.com/60'}
                                                  alt={e.title}
                                                  className="rounded me-3"
                                                  style={{width:'60px', height:'60px', objectFit:'cover'}} />
                                             <div className="flex-grow-1">
                                                 <h6 className="mb-1">{e.title}</h6>
                                                 <small className="text-muted"><i className="fa fa-map-marker me-1"></i>{e.location}</small>
                                                 <div className="small text-muted"><i className="fa fa-calendar me-1"></i>{e.date}</div>
                                             </div>
                                             <span className="badge bg-primary">Going</span>
                                         </div>
                                     </div>
                                 ))}
                             </div>
                         </div>
                    </div>
                </div>
            </div>

            {/* Edit Modal */}
            {showEdit && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">Edit Profile</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowEdit(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="text-center mb-3">
                                    <label className="d-block mb-2 fw-bold">Profile Picture</label>
                                    <input type="file" className="form-control" onChange={e => setEditForm({...editForm, image: e.target.files[0]})} />
                                </div>
                                <div className="row mb-3">
                                    <div className="col"><label>First Name</label><input className="form-control" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} /></div>
                                    <div className="col"><label>Last Name</label><input className="form-control" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} /></div>
                                </div>
                                <div className="mb-3"><label>Student ID</label><input className="form-control" value={user.studentId} disabled /></div>
                                <div className="mb-3"><label>Department</label><input className="form-control" value={user.department} disabled /></div>
                                <hr />
                                <div className="mb-3">
                                    <label>New Password (Optional)</label>
                                    <div className="input-group">
                                        <input
                                            className="form-control"
                                            type={showPassword ? 'text' : 'password'}
                                            value={editForm.password}
                                            onChange={e => setEditForm({...editForm, password: e.target.value})}
                                            placeholder="Leave blank to keep current"
                                        />
                                        <span className="input-group-text" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                                            {showPassword ? <FaEyeSlash /> : <FaEye />}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button>
                                <button className="btn btn-success" onClick={handleSave}>Save Changes</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default StudentProfile;
