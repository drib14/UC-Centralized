import React, { useState, useEffect, useCallback } from 'react';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaUser, FaPen, FaCartShopping } from 'react-icons/fa6';

const StudentProfile = () => {
    const { user, syncSession } = useAuth();
    const [orders, setOrders] = useState([]);
    const [myEvents, setMyEvents] = useState([]);
    const [showEdit, setShowEdit] = useState(false);
    const [editForm, setEditForm] = useState({ firstName: '', lastName: '', password: '' });

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
        }
    }, [user]);

    useEffect(() => {
        if (user) {
            setEditForm({
                firstName: user.firstName || (user.name ? user.name.split(' ')[0] : ''),
                lastName: user.lastName || (user.name ? user.name.split(' ').pop() : ''),
                password: ''
            });
            loadActivity();
        }
    }, [user, loadActivity]);

    const handleSave = async () => {
        try {
            const updateData = { firstName: editForm.firstName, lastName: editForm.lastName };
            if (editForm.password) updateData.password = editForm.password;
            await API.updateProfile(updateData);
            await syncSession();
            toast.success("Profile updated");
            setShowEdit(false);
        } catch (e) {
            toast.error(e.message || "Update failed");
        }
    };

    const getInitials = () => {
        const f = user.firstName ? user.firstName.charAt(0) : (user.name ? user.name.charAt(0) : 'S');
        const l = user.lastName ? user.lastName.charAt(0) : (user.name && user.name.includes(' ') ? user.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase();
    };

    if (!user) return null;

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
                    </div>
                </div>

                <div className="col-lg-8">
                    <div className="card mb-4">
                        <div className="card-header bg-success text-white"><FaCartShopping className="me-2" />Recent Orders</div>
                        <div className="card-body p-0">
                            <div className="list-group list-group-flush">
                                {orders.length === 0 ? <p className="text-center p-3 text-muted">No orders found.</p> : orders.map(o => (
                                    <div className="list-group-item" key={o._id}>
                                        <div className="d-flex justify-content-between align-items-center">
                                            <div>
                                                <h6 className="mb-1">Order #{o._id.slice(-6).toUpperCase()}</h6>
                                                <small className="text-muted">{new Date(o.createdAt || o.orderDate).toLocaleDateString()} | {o.items.length} Items</small>
                                            </div>
                                            <div className="text-end">
                                                <div className="fw-bold">₱{o.totalPrice.toFixed(2)}</div>
                                                <span className={`badge ${o.status === 'pending' ? 'bg-warning text-dark' : (o.status === 'claimed' ? 'bg-success' : 'bg-danger')}`}>
                                                    {o.status.toUpperCase()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div className="card">
                         <div className="card-header bg-primary text-white"><FaUser className="me-2" />My Events</div>
                         <div className="card-body p-0">
                             <div className="list-group list-group-flush">
                                 {myEvents.length === 0 ? <p className="text-center p-3 text-muted">No RSVP'd events.</p> : myEvents.map(e => (
                                     <div className="list-group-item" key={e._id}>
                                         <div className="d-flex justify-content-between align-items-center">
                                             <div>
                                                 <h6 className="mb-1">{e.title}</h6>
                                                 <small className="text-muted">{e.date} | {e.location}</small>
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
                                <div className="row mb-3">
                                    <div className="col"><label>First Name</label><input className="form-control" value={editForm.firstName} onChange={e => setEditForm({...editForm, firstName: e.target.value})} /></div>
                                    <div className="col"><label>Last Name</label><input className="form-control" value={editForm.lastName} onChange={e => setEditForm({...editForm, lastName: e.target.value})} /></div>
                                </div>
                                <div className="mb-3"><label>Student ID</label><input className="form-control" value={user.studentId} disabled /></div>
                                <div className="mb-3"><label>Department</label><input className="form-control" value={user.department} disabled /></div>
                                <hr />
                                <div className="mb-3"><label>New Password (Optional)</label><input className="form-control" type="password" value={editForm.password} onChange={e => setEditForm({...editForm, password: e.target.value})} placeholder="Leave blank to keep current" /></div>
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
