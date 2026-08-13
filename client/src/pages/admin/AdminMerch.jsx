import React, { useEffect, useState } from 'react';
import AdminMerchSkeleton from '../../components/skeletons/AdminMerchSkeleton';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import {
    FaShirt, FaPlus, FaPencil, FaTrash, FaMagnifyingGlass,
    FaBoxOpen, FaTriangleExclamation, FaCircleCheck, FaCircleXmark, FaTag
} from 'react-icons/fa6';

const AdminMerch = () => {
    const [merch, setMerch] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    // Modals
    const [showCreate, setShowCreate] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const initialForm = {
        name: '',
        price: '',
        stock: '',
        category: 'wearable',
        description: '',
        image: null,
        variants: []
    };
    const [form, setForm] = useState(initialForm);
    const [editData, setEditData] = useState(null);
    const [submitting, setSubmitting] = useState(false);

    // Variant Helper
    const [newVariant, setNewVariant] = useState({ size: 'M', color: 'Black', stock: 10 });

    useEffect(() => {
        loadMerch();
    }, []);

    const loadMerch = async () => {
        try {
            setLoading(true);
            const data = await API.getMerch();
            setMerch(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Failed to load merchandise items");
        } finally {
            setLoading(false);
        }
    };

    const addVariantToForm = (isEdit = false) => {
        if (!newVariant.size || !newVariant.color || newVariant.stock === '') {
            return toast.error("Please fill in size, color, and stock for the variant");
        }
        const variant = {
            size: newVariant.size,
            color: newVariant.color.trim(),
            stock: parseInt(newVariant.stock, 10) || 0
        };

        if (isEdit) {
            setEditData(prev => ({ ...prev, variants: [...(prev.variants || []), variant] }));
        } else {
            setForm(prev => ({ ...prev, variants: [...(prev.variants || []), variant] }));
        }
        setNewVariant({ size: 'M', color: 'Black', stock: 10 });
    };

    const removeVariant = (index, isEdit = false) => {
        if (isEdit) {
            setEditData(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
        } else {
            setForm(prev => ({ ...prev, variants: prev.variants.filter((_, i) => i !== index) }));
        }
    };

    const handleCreate = async (e) => {
        if (e) e.preventDefault();
        if (!form.name.trim() || !form.price) {
            toast.error("Product name and price are required");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', form.name.trim());
            formData.append('price', form.price);
            formData.append('category', form.category);
            formData.append('description', form.description.trim());

            // Compute total stock from variants if wearable, or base stock
            let totalStock = form.stock ? parseInt(form.stock, 10) : 0;
            if (form.category === 'wearable' && form.variants.length > 0) {
                totalStock = form.variants.reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0);
            }
            formData.append('stock', totalStock);
            formData.append('variants', JSON.stringify(form.variants));

            if (form.image) {
                formData.append('image', form.image);
            }

            await API.request('/merch', 'POST', formData);
            toast.success("Product added to catalog");
            setShowCreate(false);
            setForm(initialForm);
            loadMerch();
        } catch (e) {
            toast.error(e.message || "Failed to create merchandise");
        } finally {
            setSubmitting(false);
        }
    };

    const openEditModal = (item) => {
        setEditData({
            _id: item._id,
            name: item.name,
            price: item.price,
            stock: item.stock,
            category: item.category || 'wearable',
            description: item.description || '',
            variants: item.variants || [],
            image: null
        });
        setShowEditModal(true);
    };

    const handleUpdate = async (e) => {
        if (e) e.preventDefault();
        if (!editData.name.trim() || !editData.price) {
            toast.error("Product name and price are required");
            return;
        }

        setSubmitting(true);
        try {
            const formData = new FormData();
            formData.append('name', editData.name.trim());
            formData.append('price', editData.price);
            formData.append('category', editData.category);
            formData.append('description', editData.description.trim());

            let totalStock = editData.stock ? parseInt(editData.stock, 10) : 0;
            if (editData.category === 'wearable' && editData.variants.length > 0) {
                totalStock = editData.variants.reduce((acc, v) => acc + (parseInt(v.stock, 10) || 0), 0);
            }
            formData.append('stock', totalStock);
            formData.append('variants', JSON.stringify(editData.variants));

            if (editData.image) {
                formData.append('image', editData.image);
            }

            await API.request(`/merch/${editData._id}`, 'PUT', formData);
            toast.success("Product updated successfully");
            setShowEditModal(false);
            setEditData(null);
            loadMerch();
        } catch (e) {
            toast.error(e.message || "Failed to update product");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!deleteTarget) return;
        setSubmitting(true);
        try {
            await API.deleteMerch(deleteTarget._id);
            toast.success(`Product ${deleteTarget.name} deleted`);
            setShowDelete(false);
            setDeleteTarget(null);
            setMerch(merch.filter(m => m._id !== deleteTarget._id));
        } catch (e) {
            toast.error("Failed to delete product");
        } finally {
            setSubmitting(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    const getStockBadge = (stock) => {
        if (stock <= 0) {
            return <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-3 py-1 rounded-pill"><FaCircleXmark className="me-1" /> Out of Stock</span>;
        } else if (stock < 5) {
            return <span className="badge bg-warning bg-opacity-10 text-dark border border-warning px-3 py-1 rounded-pill"><FaTriangleExclamation className="me-1 text-warning" /> Low ({stock})</span>;
        }
        return <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-1 rounded-pill"><FaCircleCheck className="me-1" /> In Stock ({stock})</span>;
    };

    // Filter Logic
    const filteredMerch = merch.filter(m => {
        const matchesSearch =
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            (m.description && m.description.toLowerCase().includes(search.toLowerCase()));

        const matchesCat = categoryFilter === 'ALL' || m.category === categoryFilter;

        return matchesSearch && matchesCat;
    });

    const totalProducts = merch.length;
    const totalStockCount = merch.reduce((acc, m) => acc + (m.stock || 0), 0);
    const lowStockCount = merch.filter(m => m.stock > 0 && m.stock < 5).length;
    const outOfStockCount = merch.filter(m => m.stock <= 0).length;

    if (loading) return <AdminMerchSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Merchandise Management" description="Manage campus merchandise catalog, variants, and stock levels." />

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 fw-bold text-dark d-flex align-items-center">
                        <FaShirt className="me-2 text-primary" /> Merchandise & Inventory Control
                    </h2>
                    <p className="text-muted mb-0">Manage campus apparel, stationery, accessories, sizes, colors, and stock levels.</p>
                </div>
                <button
                    className="btn btn-primary d-flex align-items-center gap-2 rounded-pill px-4 py-2 fw-semibold shadow-sm"
                    onClick={() => setShowCreate(true)}
                >
                    <FaPlus /> Add Product
                </button>
            </div>

            {/* Metric Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Total Catalog</span>
                                <h3 className="fw-bold text-dark mt-1 mb-0">{totalProducts} Items</h3>
                            </div>
                            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                <FaShirt size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Total Units</span>
                                <h3 className="fw-bold text-success mt-1 mb-0">{totalStockCount} Units</h3>
                            </div>
                            <div className="p-3 bg-success bg-opacity-10 text-success rounded-4">
                                <FaBoxOpen size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Low Stock Alert</span>
                                <h3 className="fw-bold text-warning mt-1 mb-0">{lowStockCount}</h3>
                            </div>
                            <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-4">
                                <FaTriangleExclamation size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Out of Stock</span>
                                <h3 className="fw-bold text-danger mt-1 mb-0">{outOfStockCount}</h3>
                            </div>
                            <div className="p-3 bg-danger bg-opacity-10 text-danger rounded-4">
                                <FaCircleXmark size={22} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
                <div className="row g-3 align-items-center">
                    <div className="col-md-7">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-0"><FaMagnifyingGlass className="text-muted" /></span>
                            <input
                                type="text"
                                className="form-control bg-light border-0"
                                placeholder="Search products..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <div className="d-flex gap-1 overflow-auto">
                            {['ALL', 'wearable', 'accessories', 'stationery', 'other'].map(cat => (
                                <button
                                    key={cat}
                                    className={`btn btn-sm rounded-pill px-3 fw-semibold text-capitalize ${categoryFilter === cat ? 'btn-primary' : 'btn-light'}`}
                                    onClick={() => setCategoryFilter(cat)}
                                >
                                    {cat === 'ALL' ? 'All Items' : cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Product Table / Grid */}
            <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="bg-light">
                            <tr>
                                <th className="ps-4">Item</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock / Variants</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredMerch.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="text-center py-5 text-muted">
                                        <FaShirt size={40} className="mb-2 opacity-25" />
                                        <p className="mb-0">No merchandise items found matching your filter.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredMerch.map(item => (
                                    <tr key={item._id}>
                                        <td className="ps-4">
                                            <div className="d-flex align-items-center gap-3">
                                                {item.image ? (
                                                    <img
                                                        src={item.image}
                                                        alt={item.name}
                                                        className="rounded-3 border object-fit-cover"
                                                        style={{ width: '48px', height: '48px' }}
                                                    />
                                                ) : (
                                                    <div className="rounded-3 bg-light border d-flex align-items-center justify-content-center text-muted" style={{ width: '48px', height: '48px' }}>
                                                        <FaShirt size={20} />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="fw-bold text-dark">{item.name}</div>
                                                    <small className="text-muted line-clamp-1" style={{ maxWidth: '250px' }}>{item.description || 'No description'}</small>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge bg-light text-dark border px-2 py-1 rounded-pill text-capitalize">
                                                {item.category || 'other'}
                                            </span>
                                        </td>
                                        <td className="fw-bold text-dark">
                                            {formatCurrency(item.price)}
                                        </td>
                                        <td>
                                            {item.category === 'wearable' && Array.isArray(item.variants) && item.variants.length > 0 ? (
                                                <div>
                                                    <span className="badge bg-primary bg-opacity-10 text-primary border border-primary px-2 py-1 rounded-pill">
                                                        {item.stock} in stock ({item.variants.length} variants)
                                                    </span>
                                                </div>
                                            ) : (
                                                <span className={`badge px-2 py-1 rounded-pill ${item.stock <= 5 ? 'bg-danger bg-opacity-10 text-danger border border-danger' : 'bg-success bg-opacity-10 text-success border border-success'}`}>
                                                    {item.stock} in stock
                                                </span>
                                            )}
                                        </td>
                                        <td className="text-end pe-4">
                                            <div className="d-flex justify-content-end gap-2">
                                                <button
                                                    className="btn btn-outline-primary btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
                                                    onClick={() => openEditModal(item)}
                                                    title="Edit Item"
                                                >
                                                    <FaPenToSquare size={13} />
                                                </button>
                                                <button
                                                    className="btn btn-outline-danger btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
                                                    onClick={() => { setDeleteId(item._id); setShowDelete(true); }}
                                                    title="Delete Item"
                                                >
                                                    <FaTrash size={13} />
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

            {/* Create Product Modal */}
            {showCreate && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-primary text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center">
                                    <FaShirt className="me-2" /> Add Merchandise Item
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button>
                            </div>
                            <form onSubmit={handleCreate}>
                                <div className="modal-body p-4">
                                    <div className="row">
                                        <div className="col-md-8 mb-3">
                                            <label className="form-label fw-semibold">Product Name *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Item name"
                                                required
                                                value={form.name}
                                                onChange={e => setForm({ ...form, name: e.target.value })}
                                                autoFocus
                                            />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label fw-semibold">Price (PHP) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                placeholder="Price"
                                                required
                                                value={form.price}
                                                onChange={e => setForm({ ...form, price: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label fw-semibold">Category</label>
                                            <select
                                                className="form-select"
                                                value={form.category}
                                                onChange={e => setForm({ ...form, category: e.target.value })}
                                            >
                                                <option value="wearable">Wearables / Apparel</option>
                                                <option value="accessories">Accessories</option>
                                                <option value="stationery">Stationery & Supplies</option>
                                                <option value="other">Other Campus Items</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label fw-semibold">Base Stock (Non-variant)</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                placeholder="Stock"
                                                value={form.stock}
                                                onChange={e => setForm({ ...form, stock: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Variant Builder */}
                                    <div className="card border p-3 rounded-3 mb-3 bg-light">
                                        <label className="form-label fw-bold text-dark mb-2">Variants (Sizes, Colors & Stock)</label>
                                        <div className="row g-2 align-items-center mb-2">
                                            <div className="col-3">
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={newVariant.size}
                                                    onChange={e => setNewVariant({ ...newVariant, size: e.target.value })}
                                                >
                                                    <option value="XS">XS</option>
                                                    <option value="S">S</option>
                                                    <option value="M">M</option>
                                                    <option value="L">L</option>
                                                    <option value="XL">XL</option>
                                                    <option value="XXL">XXL</option>
                                                </select>
                                            </div>
                                            <div className="col-4">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Color"
                                                    value={newVariant.color}
                                                    onChange={e => setNewVariant({ ...newVariant, color: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-3">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    placeholder="Stock"
                                                    value={newVariant.stock}
                                                    onChange={e => setNewVariant({ ...newVariant, stock: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-success w-100 fw-semibold"
                                                    onClick={() => addVariantToForm(false)}
                                                >
                                                    <FaPlus /> Add
                                                </button>
                                            </div>
                                        </div>

                                        {form.variants.length > 0 && (
                                            <div className="table-responsive bg-white rounded-3 p-2 border">
                                                <table className="table table-sm mb-0 align-middle">
                                                    <thead>
                                                        <tr><th>Size</th><th>Color</th><th>Stock</th><th>Action</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {form.variants.map((v, i) => (
                                                            <tr key={i}>
                                                                <td className="fw-bold">{v.size}</td>
                                                                <td>{v.color}</td>
                                                                <td className="fw-bold text-success">{v.stock}</td>
                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-danger py-0 px-2"
                                                                        onClick={() => removeVariant(i, false)}
                                                                    >
                                                                        <FaTrash size={10} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Product Image</label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            onChange={e => setForm({ ...form, image: e.target.files[0] })}
                                        />
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Description</label>
                                        <textarea
                                            className="form-control"
                                            rows="2"
                                            placeholder="Description"
                                            value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                        ></textarea>
                                    </div>
                                </div>
                                <div className="modal-footer bg-light rounded-bottom-4">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowCreate(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-primary fw-semibold" disabled={submitting}>
                                        {submitting ? 'Creating...' : 'Save Product'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Edit Product Modal */}
            {showEditModal && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered modal-lg">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-warning text-dark rounded-top-4">
                                <h5 className="modal-title fw-bold d-flex align-items-center">
                                    <FaPenToSquare className="me-2" /> Edit Product
                                </h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body p-4">
                                    <div className="row">
                                        <div className="col-md-8 mb-3">
                                            <label className="form-label fw-semibold">Product Name *</label>
                                            <input
                                                type="text"
                                                className="form-control"
                                                placeholder="Item name"
                                                required
                                                value={editData.name}
                                                onChange={e => setEditData({ ...editData, name: e.target.value })}
                                            />
                                        </div>
                                        <div className="col-md-4 mb-3">
                                            <label className="form-label fw-semibold">Price (PHP) *</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                className="form-control"
                                                placeholder="Price"
                                                required
                                                value={editData.price}
                                                onChange={e => setEditData({ ...editData, price: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    <div className="row">
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label fw-semibold">Category</label>
                                            <select
                                                className="form-select"
                                                value={editData.category}
                                                onChange={e => setEditData({ ...editData, category: e.target.value })}
                                            >
                                                <option value="wearable">Wearables / Apparel</option>
                                                <option value="accessories">Accessories</option>
                                                <option value="stationery">Stationery & Supplies</option>
                                                <option value="other">Other Campus Items</option>
                                            </select>
                                        </div>
                                        <div className="col-md-6 mb-3">
                                            <label className="form-label fw-semibold">Base Stock (Non-variant)</label>
                                            <input
                                                type="number"
                                                className="form-control"
                                                placeholder="Stock"
                                                value={editData.stock}
                                                onChange={e => setEditData({ ...editData, stock: e.target.value })}
                                            />
                                        </div>
                                    </div>

                                    {/* Variant Builder */}
                                    <div className="card border p-3 rounded-3 mb-3 bg-light">
                                        <label className="form-label fw-bold text-dark mb-2">Variants (Sizes, Colors & Stock)</label>
                                        <div className="row g-2 align-items-center mb-2">
                                            <div className="col-3">
                                                <select
                                                    className="form-select form-select-sm"
                                                    value={newVariant.size}
                                                    onChange={e => setNewVariant({ ...newVariant, size: e.target.value })}
                                                >
                                                    <option value="XS">XS</option>
                                                    <option value="S">S</option>
                                                    <option value="M">M</option>
                                                    <option value="L">L</option>
                                                    <option value="XL">XL</option>
                                                    <option value="XXL">XXL</option>
                                                </select>
                                            </div>
                                            <div className="col-4">
                                                <input
                                                    type="text"
                                                    className="form-control form-control-sm"
                                                    placeholder="Color"
                                                    value={newVariant.color}
                                                    onChange={e => setNewVariant({ ...newVariant, color: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-3">
                                                <input
                                                    type="number"
                                                    className="form-control form-control-sm"
                                                    placeholder="Stock"
                                                    value={newVariant.stock}
                                                    onChange={e => setNewVariant({ ...newVariant, stock: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-2">
                                                <button
                                                    type="button"
                                                    className="btn btn-sm btn-success w-100 fw-semibold"
                                                    onClick={() => addVariantToForm(true)}
                                                >
                                                    <FaPlus /> Add
                                                </button>
                                            </div>
                                        </div>

                                        {editData.variants && editData.variants.length > 0 && (
                                            <div className="table-responsive bg-white rounded-3 p-2 border">
                                                <table className="table table-sm mb-0 align-middle">
                                                    <thead>
                                                        <tr><th>Size</th><th>Color</th><th>Stock</th><th>Action</th></tr>
                                                    </thead>
                                                    <tbody>
                                                        {editData.variants.map((v, i) => (
                                                            <tr key={i}>
                                                                <td className="fw-bold">{v.size}</td>
                                                                <td>{v.color}</td>
                                                                <td className="fw-bold text-success">{v.stock}</td>
                                                                <td>
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-danger py-0 px-2"
                                                                        onClick={() => removeVariant(i, true)}
                                                                    >
                                                                        <FaTrash size={10} />
                                                                    </button>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>

                                    <div className="mb-3">
                                        <label className="form-label fw-semibold">Change Image (Optional)</label>
                                        <input
                                            type="file"
                                            className="form-control"
                                            onChange={e => setEditData({ ...editData, image: e.target.files[0] })}
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
                                </div>
                                <div className="modal-footer bg-light rounded-bottom-4">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>
                                        Cancel
                                    </button>
                                    <button type="submit" className="btn btn-warning fw-semibold" disabled={submitting}>
                                        {submitting ? 'Updating...' : 'Update Product'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* DELETE MODAL */}
            {showDelete && deleteTarget && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-danger text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center fw-bold">
                                    <FaTrash className="me-2" /> Confirm Delete Product
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowDelete(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="mb-0">
                                    Are you sure you want to permanently delete merchandise item <strong>{deleteTarget.name}</strong>?
                                </p>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowDelete(false)}>
                                    Cancel
                                </button>
                                <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={submitting}>
                                    {submitting ? 'Deleting...' : 'Delete Product'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminMerch;
