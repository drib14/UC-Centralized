import React, { useEffect, useState } from 'react';
import AdminUsersSkeleton from '../../components/skeletons/AdminUsersSkeleton';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaPen, FaTrash } from 'react-icons/fa';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editData, setEditData] = useState(null);
    const [showEdit, setShowEdit] = useState(false);
    const [deleteId, setDeleteId] = useState(null);
    const [showDelete, setShowDelete] = useState(false);

    useEffect(() => { loadUsers(); }, []);

    const loadUsers = async () => {
        try {
            const data = await API.getUsers();
            setUsers(data);
        } catch (e) { toast.error("Failed to load users"); }
        finally { setLoading(false); }
    };

    const handleUpdate = async () => {
        try {
            const data = { role: editData.role, firstName: editData.firstName, lastName: editData.lastName, department: editData.department };
            await API.updateUser(editData._id, data);
            toast.success("User updated");
            setShowEdit(false);
            loadUsers();
        } catch(e) { toast.error(e.message); }
    };

    const handleDelete = async () => {
        try {
            await API.deleteUser(deleteId);
            toast.success("User deleted");
            setShowDelete(false);
            loadUsers();
        } catch(e) { toast.error("Failed to delete user"); }
    };

    if (loading) return <AdminUsersSkeleton />;

    return (
        <div className="container-fluid">
             <h2 className="mb-4">User Management</h2>
             <div className="card shadow mb-4">
                 <div className="card-body">
                     <div className="table-responsive">
                         <table className="table table-bordered" width="100%" cellSpacing="0">
                             <thead><tr><th>User</th><th>ID</th><th>Name</th><th>Email</th><th>Role</th><th>Dept</th><th>Action</th></tr></thead>
                             <tbody>
                                 {users.map(u => (
                                     <tr key={u._id}>
                                         <td className="text-center">
                                             {u.profileImage ?
                                                 <img src={u.profileImage} alt="User" className="rounded-circle" style={{width:'40px', height:'40px', objectFit:'cover'}} />
                                                 : <div className="rounded-circle bg-secondary text-white d-flex justify-content-center align-items-center mx-auto" style={{width:'40px', height:'40px'}}>
                                                    {((u.firstName ? u.firstName[0] : '') + (u.lastName ? u.lastName[0] : '')).toUpperCase() || 'U'}
                                                   </div>
                                             }
                                         </td>
                                         <td>{u.studentId}</td>
                                         <td>{(u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.name || 'N/A')}</td>
                                         <td>{u.email}</td>
                                         <td>{u.role}</td>
                                         <td>{u.department}</td>
                                         <td>
                                             <button className="btn btn-sm btn-primary me-2" onClick={() => { setEditData(u); setShowEdit(true); }}><FaPen /></button>
                                             <button className="btn btn-sm btn-danger" onClick={() => { setDeleteId(u._id); setShowDelete(true); }}><FaTrash /></button>
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                     </div>
                 </div>
             </div>

            {/* Edit Modal */}
            {showEdit && editData && (
                <div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-dark"><h5 className="modal-title">Edit User</h5><button className="btn-close" onClick={() => setShowEdit(false)}></button></div>
                            <div className="modal-body">
                                <div className="mb-3"><label>First Name</label><input className="form-control" value={editData.firstName} onChange={e => setEditData({...editData, firstName: e.target.value})} /></div>
                                <div className="mb-3"><label>Last Name</label><input className="form-control" value={editData.lastName} onChange={e => setEditData({...editData, lastName: e.target.value})} /></div>
                                <div className="mb-3"><label>Role</label><select className="form-select" value={editData.role} onChange={e => setEditData({...editData, role: e.target.value})}><option value="student">Student</option><option value="admin">Admin</option></select></div>
                                <div className="mb-3"><label>Department</label><input className="form-control" value={editData.department} onChange={e => setEditData({...editData, department: e.target.value})} /></div>
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowEdit(false)}>Cancel</button><button className="btn btn-primary" onClick={handleUpdate}>Update</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
             {showDelete && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">Confirm Delete</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowDelete(false)}></button>
                            </div>
                            <div className="modal-body"><p>Delete this user?</p></div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default AdminUsers;
