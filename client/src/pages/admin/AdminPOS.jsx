import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import AdminPOSSkeleton from '../../components/skeletons/AdminPOSSkeleton';
import {
    FaCashRegister, FaMagnifyingGlass, FaUser, FaShirt, FaTag,
    FaPlus, FaTrash, FaPrint, FaCircleCheck, FaRotate, FaUserCheck
} from 'react-icons/fa6';

const AdminPOS = () => {
    const [merch, setMerch] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('ALL');

    // Customer Selection
    const [userQuery, setUserQuery] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [isWalkIn, setIsWalkIn] = useState(false);
    const [showUserSearch, setShowUserSearch] = useState(false);

    // Variant Selection Modal
    const [selectedItem, setSelectedItem] = useState(null);
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [variantSelection, setVariantSelection] = useState({ size: '', color: '', stock: 0 });

    // Payment / Cash Tendered
    const [cashTendered, setCashTendered] = useState('');
    const [submitting, setSubmitting] = useState(false);

    // Completed Receipt Modal
    const [completedReceipt, setCompletedReceipt] = useState(null);
    const [showReceiptModal, setShowReceiptModal] = useState(false);

    useEffect(() => {
        loadData();
        loadUsers();
    }, []);

    const loadData = async () => {
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

    const loadUsers = async () => {
        try {
            const users = await API.getUsers();
            if (Array.isArray(users)) setAllUsers(users);
        } catch (e) {
            console.error("Failed to load users for POS", e);
        }
    };

    const handleSearchChange = (e) => {
        const q = e.target.value;
        setUserQuery(q);
        if (q.trim().length > 0) {
            const results = allUsers.filter(u => {
                const name = `${u.firstName || ''} ${u.lastName || ''} ${u.name || ''}`.toLowerCase();
                const sId = (u.studentId || '').toLowerCase();
                return name.includes(q.toLowerCase()) || sId.includes(q.toLowerCase());
            });
            setSearchResults(results.slice(0, 6));
            setShowUserSearch(true);
        } else {
            setSearchResults([]);
            setShowUserSearch(false);
        }
    };

    const selectUser = (u) => {
        setSelectedUser(u);
        setIsWalkIn(false);
        setUserQuery('');
        setShowUserSearch(false);
    };

    const handleProductClick = (item) => {
        if (item.category === 'wearable' && item.variants && item.variants.length > 0) {
            setSelectedItem(item);
            setVariantSelection({ size: '', color: '', stock: 0 });
            setShowVariantModal(true);
        } else {
            if (item.stock <= 0) return toast.error("Item is out of stock");
            addToCart(item, null);
        }
    };

    const confirmVariantSelection = () => {
        if (!variantSelection.size || !variantSelection.color) {
            return toast.error("Please select a size and color");
        }
        const variant = selectedItem.variants.find(
            v => v.size === variantSelection.size && v.color === variantSelection.color
        );
        if (!variant || variant.stock <= 0) return toast.error("Selected variant is out of stock");

        addToCart(selectedItem, variant);
        setShowVariantModal(false);
        setSelectedItem(null);
    };

    const addToCart = (item, variant) => {
        const cartId = variant ? `${item._id}_${variant.size}_${variant.color}` : item._id;
        const exists = cart.find(c => c.cartId === cartId);
        const availableStock = variant ? variant.stock : item.stock;
        const currentQty = exists ? exists.quantity : 0;

        if (currentQty + 1 > availableStock) {
            return toast.error(`Not enough stock! Available: ${availableStock}`);
        }

        if (exists) {
            setCart(cart.map(c => c.cartId === cartId ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, {
                ...item,
                cartId,
                variant,
                displayName: variant ? `${item.name} (${variant.size}, ${variant.color})` : item.name,
                quantity: 1
            }]);
        }
        toast.success(`Added ${item.name} to cart`);
    };

    const updateQty = (cartId, delta) => {
        setCart(prev => prev.map(item => {
            if (item.cartId === cartId) {
                const newQty = item.quantity + delta;
                if (newQty <= 0) return null;
                const maxStock = item.variant ? item.variant.stock : item.stock;
                if (newQty > maxStock) {
                    toast.error(`Cannot exceed available stock of ${maxStock}`);
                    return item;
                }
                return { ...item, quantity: newQty };
            }
            return item;
        }).filter(Boolean));
    };

    const removeFromCart = (cartId) => {
        setCart(cart.filter(c => c.cartId !== cartId));
    };

    const getTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!selectedUser && !isWalkIn) return toast.error("Please select a student account or choose Walk-in / Guest");

        const total = getTotal();
        const cash = parseFloat(cashTendered);
        if (isNaN(cash) || cash < total) {
            return toast.error(`Insufficient cash tendered. Total is ${formatCurrency(total)}`);
        }

        setSubmitting(true);
        const customerName = selectedUser
            ? ((selectedUser.firstName && selectedUser.lastName) ? `${selectedUser.firstName} ${selectedUser.lastName}` : (selectedUser.name || 'Student'))
            : 'Walk-in Campus Customer';

        const orderData = {
            items: cart.map(i => ({
                merch: i._id,
                quantity: i.quantity,
                variant: i.variant
            })),
            totalPrice: total,
            user: selectedUser ? selectedUser._id : undefined,
            customerName,
            status: 'claimed'
        };

        try {
            const res = await API.createOrder(orderData);
            toast.success("Transaction completed successfully!");

            // Prepare printable receipt object
            setCompletedReceipt({
                orderId: res?._id || `POS-${Date.now().toString().slice(-6)}`,
                date: new Date().toLocaleString(),
                customerName,
                studentId: selectedUser?.studentId || 'Walk-in',
                department: selectedUser?.department || 'N/A',
                items: [...cart],
                total,
                cashTendered: cash,
                change: cash - total
            });
            setShowReceiptModal(true);

            // Reset state
            setCart([]);
            setSelectedUser(null);
            setIsWalkIn(false);
            setCashTendered('');
            loadData();
        } catch (e) {
            toast.error("Transaction failed: " + (e.message || "Unknown error"));
        } finally {
            setSubmitting(false);
        }
    };

    const filteredMerch = merch.filter(m => {
        const matchesSearch =
            m.name.toLowerCase().includes(search.toLowerCase()) ||
            (m.description && m.description.toLowerCase().includes(search.toLowerCase()));
        const matchesCategory = categoryFilter === 'ALL' || m.category === categoryFilter;
        return matchesSearch && matchesCategory;
    });

    const totalAmount = getTotal();
    const tenderedVal = parseFloat(cashTendered) || 0;
    const changeAmount = tenderedVal >= totalAmount ? tenderedVal - totalAmount : 0;

    if (loading) return <AdminPOSSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Point of Sale" description="Campus cashier checkout terminal for student merchandise." />

            {/* Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 fw-bold text-dark d-flex align-items-center">
                        <FaCashRegister className="me-2 text-primary" /> Campus POS Cashier Terminal
                    </h2>
                    <p className="text-muted mb-0">Fast merchandise checkout with instant inventory deduction and receipt generation.</p>
                </div>
            </div>

            <div className="row g-4">
                {/* Left Side: Product Catalog Grid */}
                <div className="col-lg-8 order-2 order-lg-1">
                    {/* Catalog Filters */}
                    <div className="card border-0 shadow-sm rounded-4 mb-3 p-3 bg-white">
                        <div className="row g-2 align-items-center">
                            <div className="col-md-6">
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
                            <div className="col-md-6">
                                <div className="d-flex gap-1 overflow-auto">
                                    {['ALL', 'wearable', 'accessories', 'stationery', 'other'].map(cat => (
                                        <button
                                            key={cat}
                                            className={`btn btn-sm rounded-pill px-3 fw-semibold text-capitalize ${categoryFilter === cat ? 'btn-primary' : 'btn-light'}`}
                                            onClick={() => setCategoryFilter(cat)}
                                        >
                                            {cat === 'ALL' ? 'All' : cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Merch Grid */}
                    <div className="row g-3">
                        {filteredMerch.length === 0 ? (
                            <div className="col-12">
                                <div className="card border-0 shadow-sm rounded-4 p-5 text-center text-muted bg-white">
                                    <FaShirt size={48} className="mb-3 opacity-50 text-secondary" />
                                    <h5>No products found</h5>
                                    <p className="mb-0">Try changing your search keywords or category filter.</p>
                                </div>
                            </div>
                        ) : (
                            filteredMerch.map(item => (
                                <div className="col-6 col-sm-4 col-md-3" key={item._id}>
                                    <div
                                        className={`card border-0 shadow-sm rounded-4 h-100 overflow-hidden bg-white text-center p-2 cursor-pointer transition-all ${item.stock <= 0 ? 'opacity-50' : 'hover-shadow'}`}
                                        style={{ cursor: item.stock > 0 ? 'pointer' : 'not-allowed' }}
                                        onClick={() => handleProductClick(item)}
                                    >
                                        <div className="position-relative" style={{ height: '110px' }}>
                                            <img
                                                src={item.image || 'https://via.placeholder.com/150'}
                                                alt={item.name}
                                                className="w-100 h-100 object-fit-cover rounded-3"
                                            />
                                            {item.stock <= 0 && (
                                                <span className="position-absolute top-50 start-50 translate-middle badge bg-danger">
                                                    Out of Stock
                                                </span>
                                            )}
                                        </div>
                                        <div className="p-2">
                                            <h6 className="card-title fw-bold text-dark text-truncate small mb-1">{item.name}</h6>
                                            <div className="fw-bold text-primary mb-1">{formatCurrency(item.price)}</div>
                                            <small className={item.stock > 0 ? 'text-success' : 'text-danger'}>
                                                {item.stock > 0 ? `${item.stock} in stock` : 'Unavailable'}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Side: Register & Checkout Terminal */}
                <div className="col-lg-4 order-1 order-lg-2">
                    <div className="card border-0 shadow-sm rounded-4 bg-white sticky-top" style={{ top: '20px' }}>
                        <div className="card-body p-4 d-flex flex-column" style={{ minHeight: '600px' }}>
                            <h5 className="fw-bold mb-3 text-dark d-flex align-items-center">
                                <FaCashRegister className="me-2 text-primary" /> Active Register
                            </h5>

                            {/* Customer Selector */}
                            <div className="mb-3 position-relative">
                                <label className="form-label small fw-bold text-muted text-uppercase">Customer</label>
                                {selectedUser ? (
                                    <div className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light border">
                                        <div className="d-flex align-items-center gap-2">
                                            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold" style={{ width: '32px', height: '32px', fontSize: '12px' }}>
                                                {((selectedUser.firstName ? selectedUser.firstName[0] : '') + (selectedUser.lastName ? selectedUser.lastName[0] : '')).toUpperCase() || 'U'}
                                            </div>
                                            <div>
                                                <div className="fw-bold small">{selectedUser.firstName} {selectedUser.lastName}</div>
                                                <small className="text-muted font-monospace">{selectedUser.studentId || 'No ID'} • {selectedUser.department}</small>
                                            </div>
                                        </div>
                                        <button className="btn btn-sm btn-close" onClick={() => setSelectedUser(null)}></button>
                                    </div>
                                ) : isWalkIn ? (
                                    <div className="d-flex align-items-center justify-content-between p-2 rounded-3 bg-light border">
                                        <div className="d-flex align-items-center gap-2">
                                            <FaUser className="text-secondary" />
                                            <span className="small fw-semibold">Walk-in / Guest Customer</span>
                                        </div>
                                        <button className="btn btn-sm btn-close" onClick={() => setIsWalkIn(false)}></button>
                                    </div>
                                ) : (
                                    <div>
                                        <div className="input-group">
                                            <span className="input-group-text bg-light border-0"><FaMagnifyingGlass className="text-muted" size={12} /></span>
                                            <input
                                                type="text"
                                                className="form-control bg-light border-0 small"
                                                placeholder="Search student..."
                                                value={userQuery}
                                                onChange={handleSearchChange}
                                            />
                                            <button className="btn btn-outline-secondary btn-sm" onClick={() => setIsWalkIn(true)}>
                                                Walk-in
                                            </button>
                                        </div>

                                        {showUserSearch && searchResults.length > 0 && (
                                            <div className="position-absolute w-100 bg-white shadow rounded-3 mt-1 overflow-auto border" style={{ zIndex: 1000, maxHeight: '200px' }}>
                                                {searchResults.map(u => (
                                                    <div
                                                        key={u._id}
                                                        className="p-2 border-bottom hover-bg-light cursor-pointer d-flex align-items-center gap-2"
                                                        onClick={() => selectUser(u)}
                                                        style={{ cursor: 'pointer' }}
                                                    >
                                                        <div className="rounded-circle bg-primary bg-opacity-10 text-primary fw-bold d-flex align-items-center justify-content-center" style={{ width: '28px', height: '28px', fontSize: '11px' }}>
                                                            {((u.firstName ? u.firstName[0] : '') + (u.lastName ? u.lastName[0] : '')).toUpperCase() || 'U'}
                                                        </div>
                                                        <div>
                                                            <div className="small fw-bold">{u.firstName} {u.lastName}</div>
                                                            <small className="text-muted font-monospace">{u.studentId} • {u.department}</small>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Cart List */}
                            <div className="flex-grow-1 overflow-auto mb-3" style={{ maxHeight: '260px' }}>
                                {cart.length === 0 ? (
                                    <div className="text-center text-muted py-4">
                                        <FaShirt size={32} className="mb-2 opacity-25" />
                                        <p className="small mb-0">Register cart is currently empty.</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded-3 bg-light" key={item.cartId}>
                                            <div className="text-truncate me-2" style={{ maxWidth: '140px' }}>
                                                <div className="fw-bold small text-dark text-truncate">{item.name}</div>
                                                {item.variant && (
                                                    <small className="text-muted d-block">{item.variant.size} • {item.variant.color}</small>
                                                )}
                                                <small className="text-primary fw-semibold">{formatCurrency(item.price)}</small>
                                            </div>
                                            <div className="d-flex align-items-center gap-1">
                                                <button className="btn btn-sm btn-white border px-2 py-0" onClick={() => updateQty(item.cartId, -1)}>-</button>
                                                <span className="small fw-bold px-1">{item.quantity}</span>
                                                <button className="btn btn-sm btn-white border px-2 py-0" onClick={() => updateQty(item.cartId, 1)}>+</button>
                                                <button className="btn btn-sm btn-outline-danger border-0 p-1 ms-1" onClick={() => removeFromCart(item.cartId)}>
                                                    <FaTrash size={10} />
                                                </button>
                                            </div>
                                            <div className="fw-bold text-dark small text-end" style={{ minWidth: '60px' }}>
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Payment Section */}
                            <div className="mt-auto border-top pt-3">
                                <div className="d-flex justify-content-between align-items-center mb-2">
                                    <span className="text-muted fw-semibold">Grand Total:</span>
                                    <span className="fw-bold text-dark fs-4">{formatCurrency(totalAmount)}</span>
                                </div>

                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Cash Tendered (PHP)</label>
                                    <div className="input-group mb-2">
                                        <span className="input-group-text bg-light border-0">₱</span>
                                        <input
                                            type="number"
                                            className="form-control bg-light border-0 fw-bold"
                                            placeholder="Cash amount"
                                            value={cashTendered}
                                            onChange={e => setCashTendered(e.target.value)}
                                        />
                                    </div>
                                    <div className="d-flex gap-1 mb-2">
                                        <button className="btn btn-sm btn-light border flex-grow-1" onClick={() => setCashTendered(totalAmount.toString())}>Exact</button>
                                        <button className="btn btn-sm btn-light border flex-grow-1" onClick={() => setCashTendered('500')}>₱500</button>
                                        <button className="btn btn-sm btn-light border flex-grow-1" onClick={() => setCashTendered('1000')}>₱1000</button>
                                    </div>
                                </div>

                                {tenderedVal > 0 && (
                                    <div className="d-flex justify-content-between align-items-center mb-3 p-2 bg-success bg-opacity-10 rounded-3 text-success">
                                        <span className="fw-bold">Change Due:</span>
                                        <span className="fw-bold fs-5">{formatCurrency(changeAmount)}</span>
                                    </div>
                                )}

                                <button
                                    className="btn btn-primary w-100 py-2 fw-bold shadow-sm rounded-3 d-flex align-items-center justify-content-center gap-2"
                                    onClick={handleCheckout}
                                    disabled={cart.length === 0 || submitting}
                                >
                                    <FaCircleCheck /> {submitting ? 'Processing...' : 'Complete Checkout'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* VARIANT SELECTION MODAL */}
            {showVariantModal && selectedItem && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog modal-sm modal-dialog-centered">
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-primary text-white rounded-top-4">
                                <h6 className="modal-title fw-bold">Select Size & Color</h6>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowVariantModal(false)}></button>
                            </div>
                            <div className="modal-body p-3">
                                <h6 className="fw-bold text-dark mb-2">{selectedItem.name}</h6>
                                <div className="mb-3">
                                    <label className="form-label small fw-semibold">Size</label>
                                    <select
                                        className="form-select form-select-sm"
                                        value={variantSelection.size}
                                        onChange={e => setVariantSelection({ ...variantSelection, size: e.target.value, color: '', stock: 0 })}
                                    >
                                        <option value="">Select Size</option>
                                        {[...new Set(selectedItem.variants.map(v => v.size))].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                {variantSelection.size && (
                                    <div className="mb-3">
                                        <label className="form-label small fw-semibold">Color</label>
                                        <select
                                            className="form-select form-select-sm"
                                            value={variantSelection.color}
                                            onChange={e => {
                                                const col = e.target.value;
                                                const v = selectedItem.variants.find(v => v.size === variantSelection.size && v.color === col);
                                                setVariantSelection({ ...variantSelection, color: col, stock: v ? v.stock : 0 });
                                            }}
                                        >
                                            <option value="">Select Color</option>
                                            {selectedItem.variants.filter(v => v.size === variantSelection.size).map(v => (
                                                <option key={v.color} value={v.color}>{v.color} ({v.stock} in stock)</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4 p-2">
                                <button
                                    className="btn btn-primary btn-sm w-100 fw-semibold"
                                    onClick={confirmVariantSelection}
                                    disabled={!variantSelection.size || !variantSelection.color || variantSelection.stock <= 0}
                                >
                                    Add to Cart
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* PRINTABLE RECEIPT MODAL */}
            {showReceiptModal && completedReceipt && (
                <div className="modal fade show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.6)' }}>
                    <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }}>
                        <div className="modal-content border-0 rounded-4 shadow">
                            <div className="modal-header bg-dark text-white rounded-top-4">
                                <h6 className="modal-title fw-bold">Official Sales Receipt</h6>
                                <button type="button" className="btn-close btn-close-white" onClick={() => setShowReceiptModal(false)}></button>
                            </div>
                            <div className="modal-body p-4 bg-white" id="printable-receipt">
                                <div className="text-center mb-3">
                                    <h6 className="fw-bold mb-0">UNIVERSITY OF CEBU</h6>
                                    <small className="text-muted d-block">Main Campus Central Store</small>
                                    <small className="text-muted font-monospace">Receipt #{completedReceipt.orderId.slice(-8).toUpperCase()}</small>
                                </div>
                                <hr />
                                <div className="small mb-3">
                                    <div><strong>Date:</strong> {completedReceipt.date}</div>
                                    <div><strong>Customer:</strong> {completedReceipt.customerName}</div>
                                    {completedReceipt.studentId !== 'Walk-in' && (
                                        <div><strong>Student ID:</strong> {completedReceipt.studentId} • {completedReceipt.department}</div>
                                    )}
                                </div>
                                <table className="table table-sm small mb-3">
                                    <thead>
                                        <tr>
                                            <th>Item</th>
                                            <th className="text-center">Qty</th>
                                            <th className="text-end">Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {completedReceipt.items.map((i, idx) => (
                                            <tr key={idx}>
                                                <td>{i.displayName || i.name}</td>
                                                <td className="text-center">{i.quantity}</td>
                                                <td className="text-end">{formatCurrency(i.price * i.quantity)}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th colSpan="2">TOTAL:</th>
                                            <th className="text-end">{formatCurrency(completedReceipt.total)}</th>
                                        </tr>
                                        <tr>
                                            <td colSpan="2">Cash Tendered:</td>
                                            <td className="text-end">{formatCurrency(completedReceipt.cashTendered)}</td>
                                        </tr>
                                        <tr className="fw-bold">
                                            <td colSpan="2">Change:</td>
                                            <td className="text-end text-success">{formatCurrency(completedReceipt.change)}</td>
                                        </tr>
                                    </tfoot>
                                </table>
                                <div className="text-center text-muted small mt-3">
                                    Thank you for your purchase!
                                </div>
                            </div>
                            <div className="modal-footer bg-light rounded-bottom-4 d-flex justify-content-between">
                                <button className="btn btn-outline-dark btn-sm rounded-pill px-3" onClick={() => window.print()}>
                                    <FaPrint className="me-1" /> Print
                                </button>
                                <button className="btn btn-primary btn-sm rounded-pill px-3 fw-semibold" onClick={() => setShowReceiptModal(false)}>
                                    New Transaction
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminPOS;
