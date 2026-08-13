import React, { useEffect, useState } from 'react';
import AdminOrdersSkeleton from '../../components/skeletons/AdminOrdersSkeleton';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import {
    FaClipboardList, FaMagnifyingGlass, FaCircleCheck, FaClock,
    FaBoxOpen, FaPrint, FaShirt, FaPesoSign, FaArrowRight
} from 'react-icons/fa6';

const AdminOrders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('ALL');
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [updating, setUpdating] = useState(false);

    useEffect(() => {
        loadOrders();
    }, []);

    const loadOrders = async () => {
        try {
            setLoading(true);
            const data = await API.getOrders();
            setOrders(Array.isArray(data) ? data : []);
        } catch (e) {
            toast.error("Failed to load orders");
        } finally {
            setLoading(false);
        }
    };

    const handleQuickStatus = async (orderId, newStatus) => {
        try {
            await API.updateOrderStatus(orderId, newStatus);
            toast.success(`Order status updated to ${newStatus.toUpperCase()}`);
            setOrders(orders.map(o => o._id === orderId ? { ...o, status: newStatus } : o));
            if (selectedOrder && selectedOrder._id === orderId) {
                setSelectedOrder(prev => ({ ...prev, status: newStatus }));
            }
        } catch (e) {
            toast.error(e.message || "Failed to update order status");
        }
    };

    const handleSaveStatusModal = async () => {
        if (!selectedOrder) return;
        setUpdating(true);
        try {
            await API.updateOrderStatus(selectedOrder._id, selectedOrder.status);
            toast.success("Order status saved");
            setShowModal(false);
            setOrders(orders.map(o => o._id === selectedOrder._id ? selectedOrder : o));
        } catch (e) {
            toast.error(e.message || "Failed to update order");
        } finally {
            setUpdating(false);
        }
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return <span className="badge bg-warning text-dark px-3 py-1 rounded-pill">Pending</span>;
            case 'processing':
                return <span className="badge bg-info text-white px-3 py-1 rounded-pill">Processing</span>;
            case 'claimed':
                return <span className="badge bg-success px-3 py-1 rounded-pill">Claimed</span>;
            case 'cancelled':
                return <span className="badge bg-danger px-3 py-1 rounded-pill">Cancelled</span>;
            default:
                return <span className="badge bg-secondary px-3 py-1 rounded-pill">{status}</span>;
        }
    };

    const filteredOrders = orders.filter(o => {
        const cName = (o.customerName || (o.user ? `${o.user.firstName || ''} ${o.user.lastName || ''} ${o.user.name || ''}` : '')).toLowerCase();
        const studentId = (o.user?.studentId || '').toLowerCase();
        const orderId = (o._id || '').toLowerCase();

        const matchesSearch =
            cName.includes(search.toLowerCase()) ||
            studentId.includes(search.toLowerCase()) ||
            orderId.includes(search.toLowerCase());

        const matchesStatus = statusFilter === 'ALL' || o.status?.toLowerCase() === statusFilter.toLowerCase();

        return matchesSearch && matchesStatus;
    });

    const totalOrders = orders.length;
    const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const claimedOrders = orders.filter(o => o.status === 'claimed').length;
    const totalRevenue = orders.filter(o => o.status === 'claimed').reduce((acc, o) => acc + (o.totalPrice || 0), 0);

    if (loading) return <AdminOrdersSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Order Management" description="Manage student merchandise orders and fulfillment." />

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 fw-bold text-dark d-flex align-items-center">
                        <FaClipboardList className="me-2 text-primary" /> Merchandise Order Fulfillment
                    </h2>
                    <p className="text-muted mb-0">Track and fulfill merchandise orders from the student portal and campus cashier.</p>
                </div>
            </div>

            {/* Metric Cards */}
            <div className="row g-3 mb-4">
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Total Orders</span>
                                <h3 className="fw-bold text-dark mt-1 mb-0">{totalOrders}</h3>
                            </div>
                            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                <FaClipboardList size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Pending Pickup</span>
                                <h3 className="fw-bold text-warning mt-1 mb-0">{pendingOrders}</h3>
                            </div>
                            <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-4">
                                <FaClock size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Claimed Orders</span>
                                <h3 className="fw-bold text-success mt-1 mb-0">{claimedOrders}</h3>
                            </div>
                            <div className="p-3 bg-success bg-opacity-10 text-success rounded-4">
                                <FaCircleCheck size={22} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white">
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Claimed Revenue</span>
                                <h3 className="fw-bold text-primary mt-1 mb-0">{formatCurrency(totalRevenue)}</h3>
                            </div>
                            <div className="p-3 bg-success bg-opacity-10 text-success rounded-4">
                                <FaPesoSign size={22} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Toolbar */}
            <div className="card border-0 shadow-sm rounded-4 mb-4 p-3 bg-white">
                <div className="row g-3 align-items-center">
                    <div className="col-md-7">
                        <div className="input-group">
                            <span className="input-group-text bg-light border-0"><FaMagnifyingGlass className="text-muted" /></span>
                            <input
                                type="text"
                                className="form-control bg-light border-0"
                                placeholder="Search orders..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="col-md-5">
                        <div className="d-flex gap-2 overflow-auto py-1">
                            {['ALL', 'pending', 'processing', 'claimed', 'cancelled'].map(st => (
                                <button
                                    key={st}
                                    className={`btn btn-sm rounded-pill px-3 py-1 fw-semibold text-capitalize text-nowrap transition-all ${statusFilter.toLowerCase() === st.toLowerCase() ? 'btn-primary' : 'btn-light'}`}
                                    onClick={() => setStatusFilter(st)}
                                >
                                    {st === 'ALL' ? 'All Orders' : st}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Orders Table */}
            <div className="card border-0 shadow-sm rounded-4 overflow-hidden bg-white">
                <div className="table-responsive">
                    <table className="table table-hover align-middle mb-0">
                        <thead className="table-light">
                            <tr>
                                <th className="ps-4">Order ID</th>
                                <th>Date & Time</th>
                                <th>Customer / Student</th>
                                <th>Items Ordered</th>
                                <th>Total Price</th>
                                <th>Fulfillment Status</th>
                                <th className="text-end pe-4">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredOrders.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="text-center py-5 text-muted">
                                        <FaBoxOpen size={36} className="mb-2 opacity-50" />
                                        <p className="mb-0">No orders found matching current criteria.</p>
                                    </td>
                                </tr>
                            ) : (
                                filteredOrders.map(order => {
                                    const u = order.user;
                                    const customerName = u ? ((u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.name || 'Student')) : (order.customerName || 'POS Walk-in');
                                    const studentId = u?.studentId || '—';

                                    return (
                                        <tr key={order._id}>
                                            <td className="ps-4">
                                                <span className="fw-mono fw-bold text-primary">
                                                    #{order._id.slice(-6).toUpperCase()}
                                                </span>
                                            </td>
                                            <td className="text-muted small">
                                                {new Date(order.createdAt || order.orderDate).toLocaleString(undefined, {
                                                    month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </td>
                                            <td>
                                                <div className="fw-semibold text-dark">{customerName}</div>
                                                <small className="text-muted font-monospace">{studentId}</small>
                                            </td>
                                            <td>
                                                <div className="d-flex flex-column gap-1">
                                                    {order.items.slice(0, 2).map((item, idx) => (
                                                        <span key={idx} className="small text-secondary">
                                                            {item.merch?.name || 'Item'} (x{item.quantity})
                                                            {item.variant && <span className="badge bg-light text-dark ms-1">{item.variant.size} / {item.variant.color}</span>}
                                                        </span>
                                                    ))}
                                                    {order.items.length > 2 && (
                                                        <small className="text-muted fst-italic">+{order.items.length - 2} more items</small>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="fw-bold text-dark">
                                                {formatCurrency(order.totalPrice)}
                                            </td>
                                            <td>
                                                {getStatusBadge(order.status)}
                                            </td>
                                            <td className="text-end pe-4">
                                                <div className="d-flex justify-content-end gap-2">
                                                    {order.status !== 'claimed' && (
                                                        <button
                                                            className="btn btn-sm btn-outline-success rounded-pill px-3 d-inline-flex align-items-center gap-1.5 fw-semibold"
                                                            onClick={() => handleQuickStatus(order._id, 'claimed')}
                                                            title="Mark as Claimed"
                                                        >
                                                            <FaCircleCheck /> Claim
                                                        </button>
                                                    )}
                                                    <button
                                                        className="btn btn-sm btn-outline-primary rounded-pill px-3 fw-semibold"
                                                        onClick={() => { setSelectedOrder(order); setShowModal(true); }}
                                                    >
                                                        Details
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Order Inspection & Details Modal */}
            {showModal && selectedOrder && (
                <div className="modal fade show d-block animate-fade-in" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(4px)', zIndex: 1060 }} onClick={() => setShowModal(false)}>
                    <div className="modal-dialog modal-lg modal-dialog-centered mx-2 mx-sm-auto" onClick={e => e.stopPropagation()}>
                        <div className="modal-content border-0 rounded-4 shadow-lg overflow-hidden">
                            <div className="modal-header bg-primary text-white rounded-top-4">
                                <h5 className="modal-title d-flex align-items-center fw-bold">
                                    <FaClipboardList className="me-2" /> Order Details (#{selectedOrder._id.slice(-6).toUpperCase()})
                                </h5>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body p-4">
                                {/* Order Metadata */}
                                <div className="row g-3 mb-4 bg-light rounded-3 p-3">
                                    <div className="col-md-6">
                                        <small className="text-muted d-block text-uppercase fw-semibold">Customer</small>
                                        <span className="fw-bold text-dark">
                                            {selectedOrder.customerName || (selectedOrder.user ? `${selectedOrder.user.firstName || ''} ${selectedOrder.user.lastName || ''} ${selectedOrder.user.name || ''}` : 'POS Customer')}
                                        </span>
                                        {selectedOrder.user?.studentId && (
                                            <div className="text-muted small">ID: {selectedOrder.user.studentId} • {selectedOrder.user.department || 'N/A'}</div>
                                        )}
                                    </div>
                                    <div className="col-md-6">
                                        <small className="text-muted d-block text-uppercase fw-semibold">Order Timestamp</small>
                                        <span className="text-dark">
                                            {new Date(selectedOrder.createdAt || selectedOrder.orderDate).toLocaleString()}
                                        </span>
                                        <div className="mt-1">
                                            Current Status: {getStatusBadge(selectedOrder.status)}
                                        </div>
                                    </div>
                                </div>

                                {/* Items Breakdown */}
                                <h6 className="fw-bold mb-3 text-dark">Order Items</h6>
                                <div className="table-responsive mb-4">
                                    <table className="table table-bordered align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th>Item</th>
                                                <th>Variant</th>
                                                <th className="text-center">Qty</th>
                                                <th className="text-end">Unit Price</th>
                                                <th className="text-end">Subtotal</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {selectedOrder.items.map((i, idx) => {
                                                const unitPrice = i.merch?.price || 0;
                                                const subtotal = unitPrice * i.quantity;
                                                return (
                                                    <tr key={idx}>
                                                        <td className="fw-semibold">{i.merch?.name || 'Item'}</td>
                                                        <td>
                                                            {i.variant ? (
                                                                <span className="badge bg-light text-dark border">
                                                                    Size: {i.variant.size} • Color: {i.variant.color}
                                                                </span>
                                                            ) : 'Standard'}
                                                        </td>
                                                        <td className="text-center fw-bold">{i.quantity}</td>
                                                        <td className="text-end">{formatCurrency(unitPrice)}</td>
                                                        <td className="text-end fw-bold">{formatCurrency(subtotal)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <td colSpan="4" className="text-end fw-bold">Total Amount:</td>
                                                <td className="text-end fw-bold text-primary fs-5">{formatCurrency(selectedOrder.totalPrice)}</td>
                                            </tr>
                                        </tfoot>
                                    </table>
                                </div>

                                {/* Status Transition */}
                                <div className="mb-2">
                                    <label className="form-label fw-semibold">Update Fulfillment Status</label>
                                    <select
                                        className="form-select"
                                        value={selectedOrder.status}
                                        onChange={e => setSelectedOrder({ ...selectedOrder, status: e.target.value })}
                                    >
                                        <option value="pending">Pending (Awaiting fulfillment)</option>
                                        <option value="processing">Processing (Preparing items)</option>
                                        <option value="claimed">Claimed (Completed / Picked up)</option>
                                        <option value="cancelled">Cancelled</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4">
                                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                                    Close
                                </button>
                                <button type="button" className="btn btn-primary fw-semibold" onClick={handleSaveStatusModal} disabled={updating}>
                                    {updating ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminOrders;
