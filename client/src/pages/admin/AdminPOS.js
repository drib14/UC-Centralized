import React, { useState, useEffect, useRef } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaBasketShopping, FaCashRegister, FaUser } from 'react-icons/fa6';
import { FaSearch } from 'react-icons/fa';

const AdminPOS = () => {
    const [merch, setMerch] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);
    const [users, setUsers] = useState([]);
    const [filteredUsers, setFilteredUsers] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [userSearch, setUserSearch] = useState('');
    const [showUserDropdown, setShowUserDropdown] = useState(false);
    const searchRef = useRef(null);

    useEffect(() => { loadData(); }, []);

    useEffect(() => {
        // Filter users
        if (!userSearch) {
            setFilteredUsers([]);
            return;
        }
        const term = userSearch.toLowerCase();
        const results = users.filter(u =>
            (u.firstName + ' ' + u.lastName).toLowerCase().includes(term) ||
            u.studentId.includes(term)
        ).slice(0, 5); // Limit to 5 results
        setFilteredUsers(results);
    }, [userSearch, users]);

    // Click outside to close dropdown
    useEffect(() => {
        function handleClickOutside(event) {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowUserDropdown(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [searchRef]);

    const loadData = async () => {
        try {
            const [merchData, usersData] = await Promise.all([
                API.getMerch(),
                API.getUsers()
            ]);
            setMerch(merchData);
            setUsers(usersData);
        } catch (e) { toast.error("Failed to load data"); }
        finally { setLoading(false); }
    };

    const addToCart = (item) => {
        if (item.stock <= 0) return toast.error("Out of stock");
        const exists = cart.find(c => c._id === item._id);
        if (exists) {
            setCart(cart.map(c => c._id === item._id ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, { ...item, quantity: 1 }]);
        }
    };

    const updateQty = (id, change) => {
        setCart(prev => {
            return prev.map(item => {
                if (item._id === id) {
                    const newQty = item.quantity + change;
                    if (newQty <= 0) return null;
                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(Boolean);
        });
    };

    const getTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!selectedUser) {
             if (!window.confirm("No student selected. Process as Walk-in?")) return;
        }

        const orderData = {
            items: cart.map(i => ({ merch: i._id, quantity: i.quantity })),
            totalPrice: getTotal(),
            status: 'claimed',
            paymentMethod: 'cash',
            paymentStatus: 'paid'
        };

        if (selectedUser) {
            orderData.userId = selectedUser._id;
        } else {
            orderData.customerName = "Walk-in Customer";
        }

        try {
            await API.createOrder(orderData);
            toast.success("Transaction completed!");
            setCart([]);
            setSelectedUser(null);
            setUserSearch('');
            loadData(); // Refresh stock
        } catch(e) { toast.error("Transaction failed: " + e.message); }
    };

    const selectUser = (user) => {
        setSelectedUser(user);
        setUserSearch('');
        setShowUserDropdown(false);
    };

    if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

    return (
        <div className="container-fluid">
            <h2 className="mb-4">Point of Sale</h2>
            <div className="row">
                {/* Product Grid */}
                <div className="col-lg-8">
                    <div className="row">
                        {merch.map(item => (
                            <div className="col-md-3 mb-4" key={item._id} onClick={() => addToCart(item)} style={{cursor: 'pointer'}}>
                                <div className="card h-100 hover-shadow">
                                    <img src={item.image || 'https://via.placeholder.com/150'} className="card-img-top" style={{height:'120px', objectFit:'cover'}} alt={item.name} />
                                    <div className="card-body p-2 text-center">
                                        <h6 className="card-title small mb-1 text-truncate">{item.name}</h6>
                                        <p className="text-primary fw-bold mb-0">₱{item.price}</p>
                                        <small className={item.stock > 0 ? 'text-success' : 'text-danger'}>{item.stock > 0 ? `${item.stock} in stock` : 'Out of Stock'}</small>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Cart Side */}
                <div className="col-lg-4">
                    <div className="card shadow h-100">
                        <div className="card-header bg-dark text-white d-flex justify-content-between align-items-center">
                            <span>Current Order</span>
                            <span className="badge bg-primary">{cart.reduce((s,i)=>s+i.quantity,0)} Items</span>
                        </div>
                        <div className="card-body d-flex flex-column">

                            {/* Student Selection */}
                            <div className="mb-3 position-relative" ref={searchRef}>
                                <label className="form-label small fw-bold">Select Student</label>
                                {selectedUser ? (
                                    <div className="border rounded p-2 d-flex align-items-center bg-light">
                                        <img
                                            src={selectedUser.profileImage || `https://ui-avatars.com/api/?name=${selectedUser.firstName}+${selectedUser.lastName}&background=random`}
                                            className="rounded-circle me-3"
                                            width="40" height="40"
                                            alt="Profile"
                                        />
                                        <div className="flex-grow-1 overflow-hidden">
                                            <div className="fw-bold small text-truncate">{selectedUser.firstName} {selectedUser.lastName}</div>
                                            <div className="small text-muted text-truncate">{selectedUser.studentId} | {selectedUser.year} - {selectedUser.program || selectedUser.department}</div>
                                        </div>
                                        <button className="btn btn-sm btn-close ms-2" onClick={() => setSelectedUser(null)}></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="input-group">
                                            <span className="input-group-text bg-white border-end-0"><FaSearch className="text-muted" /></span>
                                            <input
                                                type="text"
                                                className="form-control border-start-0"
                                                placeholder="Search Name or ID..."
                                                value={userSearch}
                                                onChange={e => { setUserSearch(e.target.value); setShowUserDropdown(true); }}
                                                onFocus={() => setShowUserDropdown(true)}
                                            />
                                        </div>
                                        {showUserDropdown && userSearch && (
                                            <div className="list-group position-absolute w-100 shadow" style={{zIndex: 1000, maxHeight: '200px', overflowY: 'auto'}}>
                                                {filteredUsers.length > 0 ? filteredUsers.map(u => (
                                                    <button key={u._id} className="list-group-item list-group-item-action" onClick={() => selectUser(u)}>
                                                        <div className="d-flex w-100 justify-content-between">
                                                            <h6 className="mb-1 small fw-bold">{u.firstName} {u.lastName}</h6>
                                                            <small>{u.studentId}</small>
                                                        </div>
                                                        <small className="text-muted">{u.program || u.department}</small>
                                                    </button>
                                                )) : (
                                                    <div className="list-group-item text-muted small">No students found</div>
                                                )}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <hr className="my-2"/>

                            <div className="flex-grow-1 overflow-auto mb-3" style={{maxHeight: '300px'}}>
                                {cart.length === 0 ? (
                                    <div className="text-center text-muted mt-5">
                                        <FaBasketShopping className="fa-3x mb-3" />
                                        <p>Cart is empty</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded" key={item._id}>
                                            <div className="text-truncate me-2" style={{maxWidth: '120px'}}>
                                                <div className="fw-bold small">{item.name}</div>
                                                <div className="text-muted small">₱{item.price}</div>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <button className="btn btn-sm btn-outline-secondary" onClick={(e) => {e.stopPropagation(); updateQty(item._id, -1)}}>-</button>
                                                <span className="mx-2 small fw-bold">{item.quantity}</span>
                                                <button className="btn btn-sm btn-outline-secondary" onClick={(e) => {e.stopPropagation(); updateQty(item._id, 1)}}>+</button>
                                            </div>
                                            <div className="fw-bold ms-2 small">₱{(item.price * item.quantity).toFixed(2)}</div>
                                        </div>
                                    ))
                                )}
                            </div>

                            <div className="mt-auto">
                                <div className="d-flex justify-content-between align-items-center mb-3 fw-bold fs-4">
                                    <span>Total</span>
                                    <span>₱{getTotal().toFixed(2)}</span>
                                </div>
                                <button className="btn btn-success w-100 py-2 fw-bold" onClick={handleCheckout} disabled={cart.length === 0}>
                                    <FaCashRegister className="me-2" /> Complete Transaction
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
export default AdminPOS;
