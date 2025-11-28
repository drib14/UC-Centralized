import React, { useEffect, useState } from 'react';
import StudentMerchSkeleton from '../../components/skeletons/StudentMerchSkeleton';
import API from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import { FaTshirt, FaTag } from 'react-icons/fa';
import SEO from '../../components/SEO';

const StudentMerch = () => {
    const [merch, setMerch] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addItem } = useCart();
    const [selections, setSelections] = useState({});

    useEffect(() => {
        fetchMerch();
    }, []);

    const fetchMerch = async () => {
        try {
            const data = await API.getMerch();
            setMerch(data);
        } catch (error) {
            toast.error("Failed to load merch");
        } finally {
            setLoading(false);
        }
    };

    const handleSelectionChange = (itemId, field, value) => {
        setSelections(prev => {
            const newItemState = { ...prev[itemId], [field]: value };
            // If changing size, reset color
            if (field === 'size') newItemState.color = '';
            return { ...prev, [itemId]: newItemState };
        });
    };

    const handleAddToCart = (item) => {
        if (item.category === 'wearable' && item.variants && item.variants.length > 0) {
            const sel = selections[item._id] || {};
            if (!sel.size || !sel.color) return toast.error("Please select size and color");

            const variant = item.variants.find(v => v.size === sel.size && v.color === sel.color);
            if (!variant || variant.stock <= 0) return toast.error("Selected item out of stock");

            const success = addItem(item, variant);
            if (success) toast.success(`Added ${item.name} (${sel.size}, ${sel.color}) to cart!`);
            else toast.error("Could not add to cart (Stock limit reached)");
        } else {
            if (item.stock <= 0) return toast.error("Item is out of stock");
            const success = addItem(item, null);
            if (success) toast.success("Added to cart");
            else toast.error("Could not add to cart");
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

    if (loading) return <StudentMerchSkeleton />;

    return (
        <div className="container-fluid">
            <SEO title="Merchandise" description="Browse and purchase university merchandise." />
            <h2 className="mb-4 text-success">
                <FaTshirt className="me-2" />Merch Store
            </h2>

            <div className="row">
                {merch.length === 0 ? (
                    <div className="col-12 text-center mt-5"><p className="text-muted">No items available.</p></div>
                ) : (
                    merch.map(item => (
                        <div className="col-md-3 mb-4" key={item._id}>
                            <div className="card h-100 border-0 shadow-sm">
                                <img src={item.image || 'https://via.placeholder.com/300'} className="card-img-top" alt={item.name} style={{ height: '250px', objectFit: 'cover' }} />
                                <div className="card-body d-flex flex-column">
                                    <h5 className="card-title">{item.name}</h5>
                                    <p className="card-text text-muted small mb-2">{item.description}</p>

                                    {item.category === 'wearable' && item.variants && (
                                        <div className="mb-3">
                                            <div className="d-flex gap-2 mb-2">
                                                <select className="form-select form-select-sm"
                                                        value={selections[item._id]?.size || ''}
                                                        onChange={e => handleSelectionChange(item._id, 'size', e.target.value)}>
                                                    <option value="">Size</option>
                                                    {[...new Set(item.variants.map(v => v.size))].map(s => <option key={s} value={s}>{s}</option>)}
                                                </select>
                                                <select className="form-select form-select-sm"
                                                        value={selections[item._id]?.color || ''}
                                                        onChange={e => handleSelectionChange(item._id, 'color', e.target.value)}>
                                                    <option value="">Color</option>
                                                    {getAvailableColors(item).map(c => <option key={c} value={c}>{c}</option>)}
                                                </select>
                                            </div>
                                            {selections[item._id]?.size && selections[item._id]?.color && (
                                                <small className="text-muted d-block">Available: {getVariantStock(item)}</small>
                                            )}
                                        </div>
                                    )}

                                    <div className="mt-auto">
                                        <h5 className="text-success fw-bold mb-3">₱{item.price.toFixed(2)}</h5>
                                        {item.category !== 'wearable' && (
                                            <div className="d-flex justify-content-between align-items-center mb-3">
                                                <span className={`badge ${item.stock > 0 ? 'bg-success' : 'bg-danger'}`}>
                                                    {item.stock > 0 ? `${item.stock} in stock` : 'Out of Stock'}
                                                </span>
                                            </div>
                                        )}

                                        <button
                                            className="btn btn-outline-success w-100"
                                            disabled={item.category === 'wearable' ? (!selections[item._id]?.size || !selections[item._id]?.color || getVariantStock(item) <= 0) : item.stock <= 0}
                                            onClick={() => handleAddToCart(item)}
                                        >
                                            <FaTag className="me-2" />Add to Cart
                                        </button>
                                    </div>
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
