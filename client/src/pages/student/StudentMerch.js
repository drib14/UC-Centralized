import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import { FaShirt, FaTag } from 'react-icons/fa6';

const StudentMerch = () => {
    const [merch, setMerch] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addItem } = useCart();

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

    const handleAddToCart = (item) => {
        if (item.stock <= 0) {
            toast.error("Item is out of stock");
            return;
        }
        addItem(item);
        toast.success("Added to cart");
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-success"></div></div>;

    return (
        <div className="container-fluid">
            <h2 className="mb-4 text-success">
                <FaShirt className="me-2" />Merch Store
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
                                    <div className="mt-auto">
                                        <h5 className="text-success fw-bold mb-3">₱{item.price.toFixed(2)}</h5>
                                        <div className="d-flex justify-content-between align-items-center mb-3">
                                            <span className={`badge ${item.stock > 0 ? 'bg-success' : 'bg-danger'}`}>
                                                {item.stock > 0 ? `${item.stock} in stock` : 'Out of Stock'}
                                            </span>
                                        </div>
                                        <button
                                            className="btn btn-outline-success w-100"
                                            disabled={item.stock <= 0}
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
