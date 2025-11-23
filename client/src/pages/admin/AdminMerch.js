import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaPlus, FaPen, FaTrash } from 'react-icons/fa6';

const AdminMerch = () => {
    const [merch, setMerch] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const [form, setForm] = useState({ name: '', price: '', stock: '', category: 'Uniforms', description: '', image: null });
    const [editData, setEditData] = useState(null);
    const [deleteId, setDeleteId] = useState(null);

    useEffect(() => { loadMerch(); }, []);

    const loadMerch = async () => {
        try {
            const data = await API.getMerch();
            setMerch(data);
        } catch (e) { toast.error("Failed to load merch"); }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        const f = new FormData();
        Object.keys(form).forEach(k => { if(form[k]) f.append(k, form[k]); });
        try {
            await API.createMerch(f);
            toast.success("Merch created");
            setShowCreate(false);
            setForm({ name: '', price: '', stock: '', category: 'Uniforms', description: '', image: null });
            loadMerch();
        } catch(e) { toast.error(e.message); }
    };

    const handleUpdate = async () => {
        const f = new FormData();
        Object.keys(editData).forEach(k => {
             if (editData[k] && k !== '_id' && k !== '__v') {
                 if (k === 'image' && !(editData[k] instanceof File)) return;
                 f.append(k, editData[k]);
             }
        });
        try {
            await API.updateMerch(editData._id, f);
            toast.success("Merch updated");
            setShowEdit(false);
            loadMerch();
        } catch(e) { toast.error(e.message); }
    };

    const handleDelete = async () => {
        try {
            await API.deleteMerch(deleteId);
            toast.success("Merch deleted");
            setShowDelete(false);
            loadMerch();
        } catch(e) { toast.error("Failed to delete"); }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Merch Management</h2>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FaPlus className="me-2" />Add Item</button>
            </div>

            <div className="row">
                {merch.map(item => (
                    <div className="col-md-3 mb-4" key={item._id}>
                        <div className="card h-100">
                             <img src={item.image || 'https://via.placeholder.com/200'} className="card-img-top" style={{height:'200px', objectFit:'cover'}} alt={item.name} />
                             <div className="card-body">
                                 <h5 className="card-title">{item.name}</h5>
                                 <p className="text-muted small">₱{item.price} | Stock: {item.stock}</p>
                                 <div className="d-flex gap-2">
                                     <button className="btn btn-sm btn-outline-primary w-50" onClick={() => { setEditData({...item, image: null}); setShowEdit(true); }}><FaPen /> Edit</button>
                                     <button className="btn btn-sm btn-outline-danger w-50" onClick={() => { setDeleteId(item._id); setShowDelete(true); }}><FaTrash /></button>
                                 </div>
                             </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white"><h5 className="modal-title">Add Merch</h5><button className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button></div>
                            <div className="modal-body">
                                <input className="form-control mb-3" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} />
                                <div className="row mb-3">
                                    <div className="col"><input type="number" className="form-control" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: e.target.value})} /></div>
                                    <div className="col"><input type="number" className="form-control" placeholder="Stock" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} /></div>
                                </div>
                                <select className="form-select mb-3" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                    <option>Uniforms</option><option>Lanyards</option><option>Accessories</option><option>Others</option>
                                </select>
                                <input type="file" className="form-control mb-3" onChange={e => setForm({...form, image: e.target.files[0]})} />
                                <textarea className="form-control" placeholder="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})}></textarea>
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate}>Save</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Modal */}
            {showEdit && editData && (
                <div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-dark"><h5 className="modal-title">Edit Merch</h5><button className="btn-close" onClick={() => setShowEdit(false)}></button></div>
                            <div className="modal-body">
                                <input className="form-control mb-3" placeholder="Name" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} />
                                <div className="row mb-3">
                                    <div className="col"><input type="number" className="form-control" placeholder="Price" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} /></div>
                                    <div className="col"><input type="number" className="form-control" placeholder="Stock" value={editData.stock} onChange={e => setEditData({...editData, stock: e.target.value})} /></div>
                                </div>
                                <select className="form-select mb-3" value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})}>
                                    <option>Uniforms</option><option>Lanyards</option><option>Accessories</option><option>Others</option>
                                </select>
                                <label>Change Image (Optional)</label>
                                <input type="file" className="form-control mb-3" onChange={e => setEditData({...editData, image: e.target.files[0]})} />
                                <textarea className="form-control" placeholder="Description" value={editData.description} onChange={e => setEditData({...editData, description: e.target.value})}></textarea>
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
                            <div className="modal-body"><p>Delete this item?</p></div>
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
export default AdminMerch;
