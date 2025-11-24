import React, { useState } from 'react';
import API from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { toast } from 'react-toastify';
import { FaShoppingCart, FaTrash } from 'react-icons/fa';

const StudentCart = () => {
    const { cart, updateQuantity, removeItem, updateItemVariant, clearCart, getTotal } = useCart();
    const [showConfirm, setShowConfirm] = useState(false);

    const handleCheckout = async () => {
        const orderItems = cart.map(i => ({
            merch: i._id,
            quantity: i.quantity,
            variant: i.variant // Pass variant info to backend
        }));

        const orderData = {
            items: orderItems,
            totalPrice: getTotal()
        };

        try {
            await API.createOrder(orderData);
            clearCart();
            setShowConfirm(false);
            toast.success("Order placed successfully!");
        } catch (error) {
            toast.error(error.message || "Order failed");
        }
    };

    const handleVariantChange = (item, type, value) => {
        const currentSize = type === 'size' ? value : item.variant.size;
        const currentColor = type === 'color' ? value : item.variant.color;

        // If changing size, and current color is not valid for new size, reset color (or select first available)
        // But we need to find the exact variant object.

        let newVariant;
        if (type === 'size') {
            // Find variants with new size
            const sizeVariants = item.variants.filter(v => v.size === value);
            // Try to keep color if exists
            newVariant = sizeVariants.find(v => v.color === currentColor);
            // If not found, default to first color of new size
            if (!newVariant && sizeVariants.length > 0) newVariant = sizeVariants[0];
        } else {
            // Change color (size stays same)
            newVariant = item.variants.find(v => v.size === currentSize && v.color === value);
        }

        if (newVariant) {
            if (newVariant.stock <= 0) return toast.error("Selected variant is out of stock");
            const success = updateItemVariant(item.cartId, item, newVariant);
            if (!success) toast.error("Could not update variant (Stock or limit issue)");
        }
    };

    if (cart.length === 0) {
         return (
             <div className="container-fluid">
                 <h2 className="mb-4 text-success"><FaShoppingCart className="me-2" />Your Cart</h2>
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
            <h2 className="mb-4 text-success"><FaShoppingCart className="me-2" />Your Cart</h2>
            <div className="row">
                <div className="col-lg-8">
                    <div className="card mb-4">
                        <div className="card-body">
                            {cart.map(item => (
                                <div className="d-flex align-items-center mb-3 pb-3 border-bottom" key={item.cartId}>
                                    <img src={item.image || 'https://via.placeholder.com/80'} className="rounded me-3" style={{ width: '80px', height: '80px', objectFit: 'cover' }} alt={item.name} />
                                    <div className="flex-grow-1">
                                        <h6 className="mb-1">{item.name}</h6>
                                        {/* Display Variant Dropdowns if variants exist */}
                                        {item.variants && item.variants.length > 0 && item.variant ? (
                                            <div className="d-flex gap-2 mb-2">
                                                <select className="form-select form-select-sm" style={{width: 'auto'}}
                                                        value={item.variant.size}
                                                        onChange={(e) => handleVariantChange(item, 'size', e.target.value)}>
                                                    {[...new Set(item.variants.map(v => v.size))].map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                                <select className="form-select form-select-sm" style={{width: 'auto'}}
                                                        value={item.variant.color}
                                                        onChange={(e) => handleVariantChange(item, 'color', e.target.value)}>
                                                    {[...new Set(item.variants.filter(v => v.size === item.variant.size).map(v => v.color))].map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        ) : (
                                            <small className="text-muted d-block mb-1">{item.category}</small>
                                        )}
                                        <div className="text-muted small">Unit Price: ₱{item.price}</div>
                                    </div>
                                    <div className="text-end me-4 d-flex align-items-center">
                                        <div className="fw-bold me-3">₱{(item.price * item.quantity).toFixed(2)}</div>
                                        <div className="btn-group btn-group-sm me-2">
                                            <button className="btn btn-outline-secondary" onClick={() => updateQuantity(item.cartId, item.quantity - 1)}>-</button>
                                            <span className="btn btn-light disabled text-dark border-secondary" style={{ width: '40px' }}>{item.quantity}</span>
                                            <button className="btn btn-outline-secondary" onClick={() => updateQuantity(item.cartId, item.quantity + 1)}>+</button>
                                        </div>
                                    </div>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => removeItem(item.cartId)}>
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
                            <button className="btn btn-success w-100 mt-4" onClick={() => setShowConfirm(true)}>Proceed to Checkout</button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Confirm Modal */}
            {showConfirm && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">Confirm Order</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowConfirm(false)}></button>
                            </div>
                            <div className="modal-body">
                                <p>Are you sure you want to place this order?</p>
                                <div className="d-flex justify-content-between fw-bold fs-5 border-top pt-2">
                                    <span>Total:</span>
                                    <span>₱{getTotal().toFixed(2)}</span>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowConfirm(false)}>Cancel</button>
                                <button className="btn btn-success" onClick={handleCheckout}>Place Order</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default StudentCart;
