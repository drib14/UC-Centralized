import React, { useState } from 'react';
import API from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import { FaCartShopping, FaTrash } from 'react-icons/fa6';

// Icons/Assets (Using placeholders or text for now if not available)
// Ideally, import { SiGcash, SiPaymaya, SiGrab } from 'react-icons/si'; if available in react-icons
// Checking if they exist in standard react-icons, SiGcash might not.
// I will use text buttons with generic icons or just colored buttons for now to be safe.

const StudentCart = () => {
    const { cart, updateQuantity, removeItem, clearCart, getTotal } = useCart();
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);

    const handlePayment = async (methodType) => {
        setLoading(true);
        const orderItems = cart.map(i => ({
            merch: i._id,
            quantity: i.quantity
        }));

        try {
            const sessionData = {
                items: orderItems,
                payment_method_types: [methodType]
            };
            const response = await API.createCheckoutSession(sessionData);

            // Redirect to PayMongo Checkout
            if (response.attributes && response.attributes.checkout_url) {
                window.location.href = response.attributes.checkout_url;
            } else {
                toast.error("Failed to initialize payment gateway.");
                setLoading(false);
            }
        } catch (error) {
            toast.error(error.message || "Payment initiation failed");
            setLoading(false);
        }
    };

    if (cart.length === 0) {
         return (
             <div className="container-fluid">
                 <h2 className="mb-4 text-success"><FaCartShopping className="me-2" />Your Cart</h2>
                 <div className="card mb-4">
                     <div className="card-body text-center py-5">
                         <p className="text-muted">Your cart is empty.</p>
                     </div>
                 </div>
             </div>
         );
    }

    return (
        <div className="container-fluid">
            <h2 className="mb-4 text-success"><FaCartShopping className="me-2" />Your Cart</h2>
            <div className="row">
                <div className="col-lg-8">
                    <div className="card mb-4">
                        <div className="card-body">
                            {cart.map(item => (
                                <div className="d-flex align-items-center mb-3 pb-3 border-bottom" key={item._id}>
                                    <img src={item.image || 'https://via.placeholder.com/80'} className="rounded me-3" style={{ width: '80px', height: '80px', objectFit: 'cover' }} alt={item.name} />
                                    <div className="flex-grow-1">
                                        <h6 className="mb-0">{item.name}</h6>
                                        <small className="text-muted">{item.category || item.description}</small>
                                    </div>
                                    <div className="text-end me-4 d-flex align-items-center">
                                        <div className="fw-bold me-3">₱{(item.price).toFixed(2)}</div>
                                        <div className="btn-group btn-group-sm me-2">
                                            <button className="btn btn-outline-secondary" onClick={() => updateQuantity(item._id, item.quantity - 1)}>-</button>
                                            <span className="btn btn-light disabled text-dark border-secondary" style={{ width: '40px' }}>{item.quantity}</span>
                                            <button className="btn btn-outline-secondary" onClick={() => updateQuantity(item._id, item.quantity + 1)}>+</button>
                                        </div>
                                    </div>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(item._id)}>
                                        <FaTrash />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="card">
                        <div className="card-header">Order Summary</div>
                        <div className="card-body">
                            <div className="d-flex justify-content-between mb-2">
                                <span>Subtotal</span>
                                <span>₱{getTotal().toFixed(2)}</span>
                            </div>
                            <div className="d-flex justify-content-between mb-3">
                                <span>Shipping (Pickup)</span>
                                <span>Free</span>
                            </div>
                            <hr />
                            <div className="d-flex justify-content-between fw-bold fs-5">
                                <span>Total</span>
                                <span>₱{getTotal().toFixed(2)}</span>
                            </div>
                            <button className="btn btn-success w-100 mt-4" onClick={() => setShowConfirm(true)}>Proceed to Payment</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Payment Method Selection Modal */}
            {showConfirm && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">Select Payment Method</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowConfirm(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p className="mb-3">Choose how you want to pay:</p>
                                {loading ? (
                                    <div className="text-center py-3">
                                        <div className="spinner-border text-primary" role="status"></div>
                                        <p className="mt-2">Redirecting to secure checkout...</p>
                                    </div>
                                ) : (
                                    <div className="d-grid gap-2">
                                        <button className="btn btn-primary btn-lg d-flex justify-content-between align-items-center" onClick={() => handlePayment('gcash')}>
                                            <span>GCash</span>
                                            {/* Using generic text or colored badges for now as specific SVG logos might need imports */}
                                            <span className="badge bg-light text-primary">E-Wallet</span>
                                        </button>
                                        <button className="btn btn-success btn-lg d-flex justify-content-between align-items-center" onClick={() => handlePayment('grab_pay')}>
                                            <span>GrabPay</span>
                                            <span className="badge bg-light text-success">E-Wallet</span>
                                        </button>
                                        <button className="btn btn-dark btn-lg d-flex justify-content-between align-items-center" onClick={() => handlePayment('paymaya')}>
                                            <span>Maya</span>
                                            <span className="badge bg-light text-dark">E-Wallet</span>
                                        </button>
                                    </div>
                                )}
                                <div className="mt-3 pt-2 border-top d-flex justify-content-between fw-bold">
                                    <span>Total to Pay:</span>
                                    <span>₱{getTotal().toFixed(2)}</span>
                                </div>
                            </div>
                            {!loading && (
                                <div className="modal-footer">
                                    <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default StudentCart;
