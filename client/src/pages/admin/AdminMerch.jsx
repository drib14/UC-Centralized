import React, { useEffect, useState } from 'react';
import AdminMerchSkeleton from '../../components/skeletons/AdminMerchSkeleton';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaPlus, FaPen, FaTrash } from 'react-icons/fa';

const AdminMerch = () => {
    const [merch, setMerch] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);

    const initialForm = { name: '', price: '', stock: '', category: 'accessories', description: '', image: null, variants: [] };
    const [form, setForm] = useState(initialForm);
    const [editData, setEditData] = useState(null);
    const [deleteId, setDeleteId] = useState(null);

    // Temp state for adding a variant
    const [newVariant, setNewVariant] = useState({ size: '', color: '', stock: '' });

    useEffect(() => { loadMerch(); }, []);

    const loadMerch = async () => {
        try {
            const data = await API.getMerch();
            setMerch(data);
        } catch (e) { toast.error("Failed to load merch"); }
        finally { setLoading(false); }
    };

    const addVariantToForm = (isEdit = false) => {
        if (!newVariant.size || !newVariant.color || !newVariant.stock) return toast.error("Fill all variant fields");
        const variant = { ...newVariant };

        if (isEdit) {
            setEditData(prev => ({ ...prev, variants: [...(prev.variants || []), variant] }));
        } else {
            setForm(prev => ({ ...prev, variants: [...prev.variants, variant] }));
        }
        setNewVariant({ size: '', color: '', stock: '' });
    };

    const removeVariant = (index, isEdit = false) => {
        if (isEdit) {
            setEditData(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
        } else {
            setForm(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
        }
    };

    const handleCreate = async () => {
        const f = new FormData();
        Object.keys(form).forEach(k => {
            if(k === 'variants') {
                f.append(k, JSON.stringify(form[k]));
            } else if(form[k]) {
                f.append(k, form[k]);
            }
        });

        try {
            await API.createMerch(f);
            toast.success("Merch created");
            setShowCreate(false);
            setForm(initialForm);
            loadMerch();
        } catch(e) { toast.error(e.message); }
    };

    const handleUpdate = async () => {
        const f = new FormData();
        Object.keys(editData).forEach(k => {
             if (k === 'variants') {
                 f.append(k, JSON.stringify(editData[k]));
             } else if (editData[k] && k !== '_id' && k !== '__v') {
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

    const renderVariantSection = (data, isEdit) => (
        <div className="mb-3 border p-2 rounded">
            <label className="form-label fw-bold">Variants (Size/Color)</label>
            <div className="input-group mb-2">
                <select className="form-select" value={newVariant.size} onChange={e => setNewVariant({...newVariant, size: e.target.value})}>
                    <option value="">Size</option><option>XS</option><option>S</option><option>M</option><option>L</option><option>XL</option><option>XXL</option>
                </select>
                <input type="text" className="form-control" placeholder="Color" value={newVariant.color} onChange={e => setNewVariant({...newVariant, color: e.target.value})} />
                <input type="number" className="form-control" placeholder="Qty" value={newVariant.stock} onChange={e => setNewVariant({...newVariant, stock: e.target.value})} />
                <button className="btn btn-success" onClick={() => addVariantToForm(isEdit)}><FaPlus /></button>
            </div>

            <div className="table-responsive">
                <table className="table table-sm table-bordered">
                    <thead><tr><th>Size</th><th>Color</th><th>Qty</th><th>Action</th></tr></thead>
                    <tbody>
                        {(data.variants || []).map((v, i) => (
                            <tr key={i}>
                                <td>{v.size}</td><td>{v.color}</td><td>{v.stock}</td>
                                <td><button className="btn btn-xs btn-danger" onClick={() => removeVariant(i, isEdit)}><FaTrash /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <small className="text-muted">Total Stock will be calculated automatically based on variants.</small>
        </div>
    );

    if (loading) return <AdminMerchSkeleton />;

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
                                 <span className="badge bg-secondary mb-2">{item.category}</span>
                                 <div className="d-flex gap-2 mt-2">
                                     <button className="btn btn-sm btn-outline-primary w-50" onClick={() => { setEditData({...item, image: null, variants: item.variants || []}); setShowEdit(true); }}><FaPen /> Edit</button>
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
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white"><h5 className="modal-title">Add Merch</h5><button className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button></div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col"><input className="form-control" placeholder="Name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} /></div>
                                    <div className="col">
                                        <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                                            <option value="accessories">Accessories/Lanyards</option>
                                            <option value="wearable">Wearable (T-Shirts, etc)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="row mb-3">
                                    <div className="col"><input type="number" className="form-control" placeholder="Price" value={form.price} onChange={e => setForm({...form, price: e.target.value})} /></div>
                                    {/* Hide generic stock input if wearable, it is calculated from variants */}
                                    {form.category !== 'wearable' && (
                                        <div className="col"><input type="number" className="form-control" placeholder="Stock" value={form.stock} onChange={e => setForm({...form, stock: e.target.value})} /></div>
                                    )}
                                </div>

                                {form.category === 'wearable' && renderVariantSection(form, false)}

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
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-warning text-dark"><h5 className="modal-title">Edit Merch</h5><button className="btn-close" onClick={() => setShowEdit(false)}></button></div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col"><input className="form-control" placeholder="Name" value={editData.name} onChange={e => setEditData({...editData, name: e.target.value})} /></div>
                                    <div className="col">
                                        <select className="form-select" value={editData.category} onChange={e => setEditData({...editData, category: e.target.value})}>
                                            <option value="accessories">Accessories/Lanyards</option>
                                            <option value="wearable">Wearable (T-Shirts, etc)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="row mb-3">
                                    <div className="col"><input type="number" className="form-control" placeholder="Price" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} /></div>
                                    {editData.category !== 'wearable' && (
                                        <div className="col"><input type="number" className="form-control" placeholder="Stock" value={editData.stock} onChange={e => setEditData({...editData, stock: e.target.value})} /></div>
                                    )}
                                </div>

                                {editData.category === 'wearable' && renderVariantSection(editData, true)}

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
