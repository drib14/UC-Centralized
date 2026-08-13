import React, { useEffect, useState } from 'react';
import StudentMerchSkeleton from '../../components/skeletons/StudentMerchSkeleton';
import API from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import {
    FaShirt, FaTag, FaMagnifyingGlass, FaCartShopping,
    FaPlus, FaCircleCheck, FaCircleXmark
} from 'react-icons/fa6';

const StudentMerch = () => {
    const [merch, setMerch] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');
    const { addItem, cart } = useCart();
    const [selections, setSelections] = useState({});

    useEffect(() => {
        fetchMerch();
    }, []);

    const fetchMerch = async () => {
        try {
            setLoading(true);
            const data = await API.getMerch();
            setMerch(Array.isArray(data) ? data : []);
        } catch (error) {
            toast.error("Failed to load merchandise catalog");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectionChange = (itemId, field, value) => {
        setSelections(prev => {
            const newItemState = { ...prev[itemId], [field]: value };
            if (field === 'size') newItemState.color = '';
            return { ...prev, [itemId]: newItemState };
        });
    };

    const handleAddToCart = (item) => {
        if (item.category === 'wearable' && item.variants && item.variants.length > 0) {
            const sel = selections[item._id] || {};
            if (!sel.size || !sel.color) {
                return toast.error("Please select a size and color");
            }

            const variant = item.variants.find(v => v.size === sel.size && v.color === sel.color);
            if (!variant || variant.stock <= 0) {
                return toast.error("Selected item variant is out of stock");
            }

            const success = addItem(item, variant);
            if (success) toast.success(`Added ${item.name} (${sel.size}, ${sel.color}) to cart`);
            else toast.error("Could not add to cart (Stock limit reached)");
        } else {
            if (item.stock <= 0) return toast.error("Item is out of stock");
            const success = addItem(item, null);
            if (success) toast.success(`Added ${item.name} to cart`);
            else toast.error("Could not add to cart (Stock limit reached)");
        }
    };

    const getAvailableColors = (item) => {
        const sel = selections[item._id] || {};
        if (!sel.size) return [...new Set(item.variants.map(v => v.color))];
        return item.variants.filter(v => v.size === sel.size).map(v => v.color);
    };

    const getVariantStock = (item) => {
        if (item.category !== 'wearable') return item.stock;
        const sel = selections[item._id];
        if (!sel || !sel.size || !sel.color) return null;
        const v = item.variants.find(varItem => varItem.size === sel.size && varItem.color === sel.color);
        return v ? v.stock : 0;
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    const filteredMerch = merch.filter(m => {
        const matchesSearch =
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            (m.description && m.description.toLowerCase().includes(search.toLowerCase()));

        const matchesCat = categoryFilter === 'ALL' || m.category === categoryFilter;

        return matchesSearch && matchesCat;
    });

    const totalCartCount = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);

    if (loading) return <StudentMerchSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Campus Merchandise" description="Browse and order official University of Cebu apparel, accessories, and supplies." />

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 fw-bold text-dark d-flex align-items-center">
                        <FaShirt className="me-2 text-primary" /> Campus Merchandise Store
                    </h2>
                    <p className="text-muted mb-0">Official University of Cebu apparel, department polo shirts, lanyards, and supplies.</p>
                </div>
                <Link to="/student/cart" className="btn btn-primary d-flex align-items-center gap-2 rounded-pill px-4 py-2 fw-semibold shadow-sm">
                    <FaCartShopping /> Cart ({totalCartCount})
                </Link>
            </div>

            {/* Filter & Search Bar */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
                <div className="row g-3 align-items-center">
                    <div className="col-md-6">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-0"><FaMagnifyingGlass className="text-muted" /></span>
                            <input
                                type="text"
                                className="form-control bg-light border-0"
                                placeholder="Search merchandise..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-6">
                        <div className="d-flex gap-2 overflow-auto py-1">
                            {['ALL', 'wearable', 'accessories', 'stationery', 'other'].map(cat => (
                                <button
                                    key={cat}
                                    className={`btn btn-sm rounded-pill px-3.5 py-1.5 fw-semibold text-capitalize text-nowrap transition-all ${categoryFilter === cat ? 'btn-primary' : 'btn-outline-secondary'}`}
                                    onClick={() => setCategoryFilter(cat)}
                                >
                                    {cat === 'ALL' ? 'All Items' : cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Products Grid */}
            <div className="row g-4">
                {filteredMerch.length === 0 ? (
                    <div className="col-12 text-center py-5 text-muted">
                        <FaShirt size={48} className="mb-3 opacity-25" />
                        <h5>No campus merchandise found</h5>
                        <p className="small">Try adjusting your filters or search keywords</p>
                    </div>
                ) : (
                    filteredMerch.map(item => (
                        <div className="col-12 col-sm-6 col-lg-4 col-xl-3" key={item._id}>
                            <div className="card border-0 shadow-sm rounded-4 h-100 bg-white hover-shadow overflow-hidden d-flex flex-column hover-lift">
                                <div className="position-relative" style={{ height: '220px', backgroundColor: '#f1f5f9' }}>
                                    <img
                                        src={item.image || 'https://via.placeholder.com/300'}
                                        className="w-100 h-100 object-fit-cover"
                                        alt={item.name}
                                    />
                                    <span className="position-absolute top-0 start-0 m-3 badge bg-white text-dark shadow-sm rounded-pill px-3 py-1.5 text-capitalize fw-semibold d-inline-flex align-items-center gap-2">
                                        <FaTag className="text-primary" size={11} /> {item.category || 'General'}
                                    </span>
                                </div>
                                <div className="card-body p-4 d-flex flex-column flex-grow-1">
                                    <div className="d-flex justify-content-between align-items-start mb-2">
                                        <h5 className="card-title fw-bold text-dark mb-0 line-clamp-1 font-outfit">{item.name}</h5>
                                    </div>
                                    <h4 className="fw-bold text-primary mb-2 font-outfit">{formatCurrency(item.price)}</h4>
                                    <p className="card-text text-muted small mb-3 line-clamp-2">{item.description || 'Official UC campus item'}</p>

                                    {/* Variant Selectors for Wearables */}
                                    {item.category === 'wearable' && item.variants && item.variants.length > 0 && (
                                        <div className="mb-3">
                                            <div className="d-flex gap-2 mb-1">
                                                <select
                                                    className="form-select form-select-sm rounded-2"
                                                    value={selections[item._id]?.size || ''}
                                                    onChange={e => handleSelectionChange(item._id, 'size', e.target.value)}
                                                >
                                                    <option value="">Size</option>
                                                    {[...new Set(item.variants.map(v => v.size))].map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                                <select
                                                    className="form-select form-select-sm rounded-2"
                                                    value={selections[item._id]?.color || ''}
                                                    onChange={e => handleSelectionChange(item._id, 'color', e.target.value)}
                                                >
                                                    <option value="">Color</option>
                                                    {getAvailableColors(item).map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {selections[item._id]?.size && selections[item._id]?.color && (
                                                <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                                    Available: {getVariantStock(item)} units
                                                </small>
                                            )}
                                        </div>
                                    )}

                                    {item.category !== 'wearable' && (
                                        <div className="mb-3">
                                            {item.stock > 0 ? (
                                                <span className="badge bg-success bg-opacity-10 text-success border border-success px-2.5 py-1 rounded-pill small d-inline-flex align-items-center gap-1.5">
                                                    <FaCircleCheck /> {item.stock} in stock
                                                </span>
                                            ) : (
                                                <span className="badge bg-danger bg-opacity-10 text-danger border border-danger px-2.5 py-1 rounded-pill small d-inline-flex align-items-center gap-1.5">
                                                    <FaCircleXmark /> Out of stock
                                                </span>
                                            )}
                                        </div>
                                    )}

                                    <button
                                        className="btn btn-primary rounded-pill mt-auto w-100 fw-semibold d-flex align-items-center justify-content-center gap-2 py-2 shadow-sm"
                                        onClick={() => handleAddToCart(item)}
                                    >
                                        <FaPlus size={12} /> Add to Cart
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default StudentMerch;
