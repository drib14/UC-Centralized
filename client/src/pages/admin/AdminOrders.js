import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);

    useEffect(() => { loadOrders(); }, []);

    const loadOrders = async () => {
        try {
            const data = await API.getOrders();
            setOrders(data);
        } catch (e) { toast.error("Failed to load orders"); }
        finally { setLoading(false); }
    };

    const updateStatus = async () => {
        try {
            await API.updateOrderStatus(selectedOrder._id, selectedOrder.status);
            toast.success("Status updated");
            setShowModal(false);
            loadOrders();
        } catch(e) { toast.error(e.message); }
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <h2 className="mb-4">Order Management</h2>
            <div className="card shadow mb-4">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-bordered" width="100%" cellSpacing="0">
                            <thead><tr><th>ID</th><th>Date</th><th>Customer</th><th>Items</th><th>Total</th><th>Status</th><th>Action</th></tr></thead>
                            <tbody>
                                {orders.map(o => {
                                    let cName = 'Unknown';
                                    if (o.customerName) {
                                        cName = o.customerName;
                                    } else if (o.user) {
                                        if (o.user.firstName && o.user.lastName) {
                                            cName = `${o.user.firstName} ${o.user.lastName}`;
                                        } else {
                                            cName = o.user.name || 'Unknown User';
                                        }
                                    }

                                    return (
                                        <tr key={o._id}>
                                            <td>{o._id.slice(-6).toUpperCase()}</td>
                                            <td>{new Date(o.createdAt || o.orderDate).toLocaleDateString()}</td>
                                            <td>{cName}</td>
                                            <td>{o.items.length} items</td>
                                            <td>₱{o.totalPrice.toFixed(2)}</td>
                                            <td><span className={`badge ${o.status === 'pending' ? 'bg-warning text-dark' : (o.status === 'claimed' ? 'bg-success' : 'bg-danger')}`}>{o.status.toUpperCase()}</span></td>
                                            <td><button className="btn btn-sm btn-primary" onClick={() => { setSelectedOrder(o); setShowModal(true); }}>View / Update</button></td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* Modal */}
            {showModal && selectedOrder && (
                <div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-lg">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white"><h5 className="modal-title">Order Details</h5><button className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button></div>
                            <div className="modal-body">
                                <div className="row mb-3">
                                    <div className="col-md-6"><p><strong>Order ID:</strong> {selectedOrder._id}</p></div>
                                    <div className="col-md-6"><p><strong>Date:</strong> {new Date(selectedOrder.createdAt || selectedOrder.orderDate).toLocaleString()}</p></div>
                                </div>
                                <h6>Items:</h6>
                                <ul className="list-group mb-3">
                                    {selectedOrder.items.map((i, idx) => (
                                        <li className="list-group-item d-flex justify-content-between align-items-center" key={idx}>
                                            <div>{i.merch ? i.merch.name : 'Unknown Item'} <small className="text-muted">x{i.quantity}</small></div>
                                            <span>₱{(i.merch ? i.merch.price * i.quantity : 0).toFixed(2)}</span>
                                        </li>
                                    ))}
                                </ul>
                                <h5 className="text-end mb-3">Total: ₱{selectedOrder.totalPrice.toFixed(2)}</h5>
                                <hr />
                                <div className="mb-3">
                                    <label className="form-label">Update Status</label>
                                    <select className="form-select" value={selectedOrder.status} onChange={e => setSelectedOrder({...selectedOrder, status: e.target.value})}>
                                        <option value="pending">Pending</option><option value="claimed">Claimed</option><option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowModal(false)}>Close</button><button className="btn btn-primary" onClick={updateStatus}>Save Changes</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default AdminOrders;
