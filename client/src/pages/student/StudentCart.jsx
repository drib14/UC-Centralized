import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import { Link } from 'react-router-dom';
import SEO from '../../components/SEO';
import StudentCartSkeleton from '../../components/skeletons/StudentCartSkeleton';
import {
    FaCartShopping, FaTrash, FaArrowLeft, FaShirt,
    FaLocationDot, FaCircleCheck
} from 'react-icons/fa6';

const StudentCart = () => {
    const { cart, updateQuantity, removeItem, updateItemVariant, clearCart, getTotal } = useCart();
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(true);
    const [placingOrder, setPlacingOrder] = useState(false);

    useEffect(() => {
        setTimeout(() => setLoading(false), 400);
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    const handleCheckout = async () => {
        const orderItems = cart.map(i => ({
            merch: i._id,
            quantity: i.quantity,
            variant: i.variant
        }));

        const orderData = {
            items: orderItems,
            totalPrice: getTotal()
        };

        setPlacingOrder(true);
        try {
            await API.createOrder(orderData);
            clearCart();
            setShowConfirm(false);
            toast.success("Order placed successfully! You can claim it at the campus cashier store.");
        } catch (error) {
            toast.error(error.message || "Order checkout failed");
        } finally {
            setPlacingOrder(false);
        }
    };

    const handleVariantChange = (item, type, value) => {
        const currentSize = type === 'size' ? value : item.variant.size;
        const currentColor = type === 'color' ? value : item.variant.color;

        let newVariant;
        if (type === 'size') {
            const sizeVariants = item.variants.filter(v => v.size === value);
            newVariant = sizeVariants.find(v => v.color === currentColor);
            if (!newVariant && sizeVariants.length > 0) newVariant = sizeVariants[0];
        } else {
            newVariant = item.variants.find(v => v.size === currentSize && v.color === value);
        }

        if (newVariant) {
            if (newVariant.stock <= 0) return toast.error("Selected variant is out of stock");
            const success = updateItemVariant(item.cartId, item, newVariant);
            if (!success) toast.error("Could not update variant (Stock limit reached)");
        }
    };

    if (loading) return <StudentCartSkeleton />;

    if (cart.length === 0) {
        return (
            <div className="container-fluid py-4">
                <SEO title="Shopping Cart" description="Your student merchandise cart is empty." />
                <h2 className="mb-4 fw-bold text-dark d-flex align-items-center">
                    <FaCartShopping className="me-2 text-primary" /> Shopping Bag
                </h2>
                <div className="card border-0 shadow-sm rounded-4 p-5 text-center bg-white">
                    <FaCartShopping size={64} className="mb-3 opacity-25 text-primary mx-auto" />
                    <h4 className="fw-bold text-dark">Your bag is empty</h4>
                    <p className="text-muted mb-4">You have not added any campus merchandise or apparel yet.</p>
                    <div>
                        <Link to="/student/merch" className="btn btn-primary rounded-pill px-4 py-2 fw-semibold shadow-sm">
                            <FaShirt className="me-2" /> Browse Campus Merchandise
                        </Link>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid py-4">
            <SEO title="Shopping Cart" description="Review your university merchandise orders and proceed to checkout." />

            <div className="d-flex justify-content-between align-items-center mb-4">
                <div>
                    <h2 className="mb-1 fw-bold text-dark d-flex align-items-center">
                        <FaCartShopping className="me-2 text-primary" /> Shopping Bag
                    </h2>
                    <p className="text-muted mb-0">Review items in your order before submitting for campus store pickup.</p>
                </div>
                <Link to="/student/merch" className="btn btn-outline-primary rounded-pill px-3 d-flex align-items-center gap-2">
                    <FaArrowLeft size={12} /> Continue Shopping
                </Link>
            </div>

            <div className="row g-4">
                {/* Cart Items List */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 bg-white overflow-hidden">
                        <div className="card-body p-4">
                            {cart.map((item, idx) => (
                                <div
                                    className={`d-flex flex-column flex-sm-row align-items-sm-center justify-content-between gap-3 pb-3 mb-3 ${idx < cart.length - 1 ? 'border-bottom' : ''}`}
                                    key={item.cartId}
                                >
                                    <div className="d-flex align-items-center gap-3">
                                        <img
                                            src={item.image || 'https://via.placeholder.com/100'}
                                            className="rounded-3 object-fit-cover shadow-sm"
                                            style={{ width: '80px', height: '80px', minWidth: '80px' }}
                                            alt={item.name}
                                        />
                                        <div>
                                            <h6 className="fw-bold text-dark mb-1">{item.name}</h6>

                                            {/* Size / Color Selector */}
                                            {item.variants && item.variants.length > 0 && item.variant ? (
                                                <div className="mb-2">
                                                    <div className="d-flex flex-wrap gap-1 mb-1">
                                                        {[...new Set(item.variants.map(v => v.size))].map(s => (
                                                            <button
                                                                key={s}
                                                                type="button"
                                                                className={`btn btn-sm py-0 px-2 rounded-pill small ${item.variant.size === s ? 'btn-primary' : 'btn-light border text-secondary'}`}
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => handleVariantChange(item, 'size', s)}
                                                            >
                                                                {s}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="d-flex flex-wrap gap-1">
                                                        {[...new Set(item.variants.filter(v => v.size === item.variant.size).map(v => v.color))].map(c => (
                                                            <button
                                                                key={c}
                                                                type="button"
                                                                className={`btn btn-sm py-0 px-2 rounded-pill small ${item.variant.color === c ? 'btn-success' : 'btn-light border text-secondary'}`}
                                                                style={{ fontSize: '0.75rem' }}
                                                                onClick={() => handleVariantChange(item, 'color', c)}
                                                            >
                                                                {c}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="badge bg-light text-dark border mb-1 small text-capitalize">{item.category}</span>
                                            )}

                                            <div className="text-muted small">Unit Price: {formatCurrency(item.price)}</div>
                                        </div>
                                    </div>

                                    <div className="d-flex align-items-center justify-content-between justify-content-sm-end gap-3">
                                        <div className="d-flex align-items-center border rounded-pill p-1 bg-light">
                                            <button
                                                className="btn btn-sm btn-white rounded-circle px-2 py-0"
                                                onClick={() => updateQuantity(item.cartId, item.quantity - 1)}
                                            >
                                                -
                                            </button>
                                            <span className="px-2 fw-bold small">{item.quantity}</span>
                                            <button
                                                className="btn btn-sm btn-white rounded-circle px-2 py-0"
                                                onClick={() => updateQuantity(item.cartId, item.quantity + 1)}
                                            >
                                                +
                                            </button>
                                        </div>

                                        <div className="fw-bold text-dark fs-6" style={{ minWidth: '80px', textAlign: 'right' }}>
                                            {formatCurrency(item.price * item.quantity)}
                                        </div>

                                        <button
                                            className="btn btn-outline-danger btn-sm rounded-circle p-2 d-flex align-items-center justify-content-center"
                                            onClick={() => removeItem(item.cartId)}
                                            title="Remove Item"
                                        >
                                            <FaTrash size={12} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Order Summary & Checkout Card */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 bg-white p-4">
                        <h5 className="fw-bold text-dark mb-3">Order Summary</h5>
                        <div className="d-flex justify-content-between text-muted mb-2">
                            <span>Subtotal ({cart.reduce((a, b) => a + b.quantity, 0)} items)</span>
                            <span className="text-dark fw-semibold">{formatCurrency(getTotal())}</span>
                        </div>
                        <div className="d-flex justify-content-between text-muted mb-3">
                            <span>Campus Pickup</span>
                            <span className="text-success fw-semibold">FREE</span>
                        </div>

                        <div className="alert alert-light border rounded-3 p-3 mb-3 small text-muted">
                            <div className="fw-bold text-dark mb-1 d-flex align-items-center gap-2">
                                <FaLocationDot className="text-danger" /> Pickup Location:
                            </div>
                            UC Main Campus Central Store & Cashier Window. Present your Student ID upon claim.
                        </div>

                        <hr />
                        <div className="d-flex justify-content-between align-items-center mb-4">
                            <span className="fw-bold fs-5 text-dark">Total Amount</span>
                            <span className="fw-bold fs-4 text-primary">{formatCurrency(getTotal())}</span>
                        </div>

                        <button
                            className="btn btn-primary w-100 py-3 rounded-pill fw-bold shadow-sm d-flex align-items-center justify-content-center gap-2"
                            onClick={() => setShowConfirm(true)}
                        >
                            <FaCircleCheck /> Submit Order
                        </button>
                    </div>
                </div>
            </div>

            {/* Checkout Confirmation Modal */}
            {showConfirm && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-primary text-white rounded-top-4">
                                <h5 className="modal-title fw-bold">Confirm Campus Order</h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowConfirm(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                <p className="mb-3">
                                    Are you sure you want to submit this merchandise order?
                                </p>
                                <div className="bg-light p-3 rounded-3 mb-3">
                                    <div className="d-flex justify-content-between fw-bold fs-5 text-dark">
                                        <span>Total Amount Due:</span>
                                        <span className="text-primary">{formatCurrency(getTotal())}</span>
                                    </div>
                                    <small className="text-muted d-block mt-1">Payment is processed upon pickup at the campus cashier.</small>
                                </div>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowConfirm(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary fw-semibold"
                                    onClick={handleCheckout}
                                    disabled={placingOrder}
                                >
                                    {placingOrder ? 'Processing...' : 'Confirm & Place Order'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentCart;
