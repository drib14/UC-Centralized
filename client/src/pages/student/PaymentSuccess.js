import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import API from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { FaCheckCircle, FaTimesCircle, FaSpinner } from 'react-icons/fa6';

const PaymentSuccess = () => {
    const [searchParams] = useSearchParams();
    const sessionId = searchParams.get('session_id');
    const navigate = useNavigate();
    const { clearCart } = useCart();
    const [status, setStatus] = useState('loading'); // loading, success, error
    const [message, setMessage] = useState('Verifying payment...');

    useEffect(() => {
        if (!sessionId) {
            setStatus('error');
            setMessage('Invalid Session ID');
            return;
        }

        const verifyPayment = async () => {
            try {
                // 1. Retrieve session from PayMongo via Backend
                const session = await API.retrieveCheckoutSession(sessionId);

                if (session.attributes.payment_status === 'paid') {
                    // 2. Create Order in DB
                    // Parse line items and find merch IDs?
                    // Since PayMongo session doesn't store our Mongo IDs directly in a way we can easily trust without mapping back,
                    // we rely on the fact that we sent them.
                    // However, robust way is to store a pending order in DB first, then update it.
                    // BUT, for this simplified flow, we'll reconstruct the order from the PayMongo session line items if possible,
                    // OR better, we just trust the cart state? No, cart state might have changed or be lost if cross-device.
                    // Actually, the best way without a pending order DB entry is to encode the item IDs in the metadata.
                    // Let's check if we can rely on LocalStorage Cart or if we need to implement Pending Orders.
                    // For now, I will assume the user is on the same device and use the cart context to clear it,
                    // BUT for creating the order, I need the items.
                    // The backend `create-checkout-session` didn't save a pending order.
                    // A quick fix: We should have created a pending order.
                    // ALTERNATIVE: Use the Cart from Context? No, unreliable.
                    // Let's check `API.retrieveCheckoutSession` response. It has `line_items`.
                    // But `line_items` might not have our Merch ID unless we put it in metadata.

                    // REVISITING PLAN:
                    // To ensure data integrity, I will update `create-checkout-session` to include `metadata` with `items` (JSON stringified).
                    // Then here, I read that metadata.

                    // WAIT: I cannot easily edit the previous backend step without re-doing it.
                    // Let me check if I can parse the description or name back to ID? No.
                    // I'll make a quick update to `backend/routes/payments.js` to include metadata.

                    // Assuming I fix the backend to return metadata:
                    const items = JSON.parse(session.attributes.metadata.items);

                    const orderData = {
                        items: items.map(i => ({ merch: i.merch, quantity: i.quantity })),
                        totalPrice: session.attributes.amount_total / 100, // Convert back to peso
                        paymentMethod: session.attributes.payment_method_types[0], // approximate
                        paymentStatus: 'paid',
                        paymentId: session.id,
                        status: 'pending' // Paid but not yet claimed/processed
                    };

                    await API.createOrder(orderData);
                    clearCart();
                    setStatus('success');
                } else {
                    setStatus('error');
                    setMessage('Payment not completed. Status: ' + session.attributes.payment_status);
                }
            } catch (err) {
                console.error(err);
                // If error is "Order already exists" (duplicate paymentId), handle gracefully?
                // For now, just show error.
                setStatus('error');
                setMessage('Failed to verify payment or create order.');
            }
        };

        verifyPayment();
    }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="container mt-5 text-center">
            <div className="card shadow-lg p-5 mx-auto" style={{ maxWidth: '600px' }}>
                {status === 'loading' && (
                    <>
                        <FaSpinner className="fa-spin fa-4x text-primary mb-4" />
                        <h3>Processing Payment...</h3>
                        <p className="text-muted">{message}</p>
                    </>
                )}
                {status === 'success' && (
                    <>
                        <FaCheckCircle className="fa-4x text-success mb-4" />
                        <h2 className="text-success">Payment Successful!</h2>
                        <p className="lead">Your order has been placed successfully.</p>
                        <Link to="/student/dashboard" className="btn btn-primary mt-3 me-2">Go to Dashboard</Link>
                        <Link to="/student/merch" className="btn btn-outline-primary mt-3">Continue Shopping</Link>
                    </>
                )}
                {status === 'error' && (
                    <>
                        <FaTimesCircle className="fa-4x text-danger mb-4" />
                        <h2 className="text-danger">Payment Failed</h2>
                        <p className="text-muted">{message}</p>
                        <Link to="/student/cart" className="btn btn-warning mt-3">Return to Cart</Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess;
