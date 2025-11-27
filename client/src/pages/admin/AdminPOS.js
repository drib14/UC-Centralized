import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaShoppingBasket, FaCashRegister, FaSearch, FaUser } from 'react-icons/fa';
import AdminPOSSkeleton from '../../components/skeletons/AdminPOSSkeleton';

const AdminPOS = () => {
    const [merch, setMerch] = useState([]);
    const [cart, setCart] = useState([]);
    const [loading, setLoading] = useState(true);

    // User Search State
    const [userQuery, setUserQuery] = useState('');
    const [allUsers, setAllUsers] = useState([]);
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUser, setSelectedUser] = useState(null);
    const [showUserSearch, setShowUserSearch] = useState(false);

    // Variant Selection Modal State
    const [selectedItem, setSelectedItem] = useState(null);
    const [showVariantModal, setShowVariantModal] = useState(false);
    const [variantSelection, setVariantSelection] = useState({ size: '', color: '', stock: 0, _id: null });

    useEffect(() => {
        loadData();
        loadUsers();
    }, []);

    const loadData = async () => {
        try {
            const data = await API.getMerch();
            setMerch(data);
        } catch (e) { toast.error("Failed to load products"); }
        finally {
             setTimeout(() => setLoading(false), 800);
        }
    };

    const loadUsers = async () => {
        try {
            const users = await API.getUsers();
            setAllUsers(users);
        } catch (e) { console.error("Failed to load users for search"); }
    };

    // User Search Logic
    const handleSearchChange = (e) => {
        const q = e.target.value;
        setUserQuery(q);
        if (q.length > 0) {
            const results = allUsers.filter(u =>
                (u.firstName && u.firstName.toLowerCase().includes(q.toLowerCase())) ||
                (u.lastName && u.lastName.toLowerCase().includes(q.toLowerCase())) ||
                (u.studentId && u.studentId.includes(q))
            );
            setSearchResults(results.slice(0, 5));
            setShowUserSearch(true);
        } else {
            setSearchResults([]);
            setShowUserSearch(false);
        }
    };

    const selectUser = (u) => {
        setSelectedUser(u);
        setUserQuery('');
        setShowUserSearch(false);
    };

    // Add to Cart Logic
    const handleProductClick = (item) => {
        if (item.category === 'wearable' && item.variants && item.variants.length > 0) {
            setSelectedItem(item);
            setVariantSelection({ size: '', color: '', stock: 0, _id: null }); // reset
            setShowVariantModal(true);
        } else {
            // Non-wearable or no variants (Accessory)
            if (item.stock <= 0) return toast.error("Out of stock");
            addToCart(item, null); // No variant
        }
    };

    const confirmVariantSelection = () => {
        if (!variantSelection.size || !variantSelection.color) return toast.error("Please select size and color");
        if (variantSelection.stock <= 0) return toast.error("Selected variant is out of stock");

        // Find variant object in the item
        const variantObj = selectedItem.variants.find(v => v.size === variantSelection.size && v.color === variantSelection.color);

        addToCart(selectedItem, variantObj);
        setShowVariantModal(false);
    };

    const addToCart = (item, variant) => {
        // Unique ID for cart item: itemID + (variantID or variantKey)
        const cartId = variant ? `${item._id}-${variant.size}-${variant.color}` : item._id;
        const exists = cart.find(c => c.cartId === cartId);

        // Check stock
        const availableStock = variant ? variant.stock : item.stock;
        const currentQty = exists ? exists.quantity : 0;
        if (currentQty + 1 > availableStock) return toast.error("Not enough stock!");

        if (exists) {
            setCart(cart.map(c => c.cartId === cartId ? { ...c, quantity: c.quantity + 1 } : c));
        } else {
            setCart([...cart, {
                ...item,
                cartId,
                variant: variant, // Store variant info
                name: variant ? `${item.name} (${variant.size}, ${variant.color})` : item.name,
                quantity: 1
            }]);
        }
    };

    const updateQty = (cartId, change) => {
        setCart(prev => {
            return prev.map(item => {
                if (item.cartId === cartId) {
                    const newQty = item.quantity + change;
                    if (newQty <= 0) return null;

                    // Stock check
                    const maxStock = item.variant ? item.variant.stock : item.stock;
                    if (newQty > maxStock) {
                        toast.error("Max stock reached");
                        return item;
                    }

                    return { ...item, quantity: newQty };
                }
                return item;
            }).filter(Boolean);
        });
    };

    const getTotal = () => cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const handleCheckout = async () => {
        if (cart.length === 0) return toast.error("Cart is empty");
        if (!selectedUser) return toast.error("Please select a user");

        const orderData = {
            items: cart.map(i => ({
                merch: i._id,
                quantity: i.quantity,
                // Passing variant details for record keeping
                variant: i.variant
            })),
            totalPrice: getTotal(),
            user: selectedUser._id, // Link to user
            customerName: `${selectedUser.firstName} ${selectedUser.lastName}`,
            status: 'claimed'
        };

        try {
            await API.createOrder(orderData);
            toast.success("Transaction completed!");
            setCart([]);
            setSelectedUser(null);
            loadData(); // Refresh stock
        } catch(e) { toast.error("Transaction failed: " + e.message); }
    };

    if (loading) return <AdminPOSSkeleton />;

    return (
        <div className="container-fluid">
            <h2 className="mb-4">Point of Sale</h2>
            <div className="row">
                {/* Product Grid */}
                <div className="col-lg-8">
                    <div className="row">
                        {merch.map(item => (
                            <div className="col-md-3 mb-4" key={item._id} onClick={() => handleProductClick(item)} style={{cursor: 'pointer'}}>
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
                            {/* User Selection */}
                            <div className="mb-3 position-relative">
                                <label className="form-label fw-bold">Customer</label>
                                {selectedUser ? (
                                    <div className="d-flex align-items-center p-2 border rounded bg-light">
                                        {selectedUser.profileImage ?
                                            <img src={selectedUser.profileImage} className="rounded-circle me-2" style={{width:'40px', height:'40px', objectFit:'cover'}} alt="User"/>
                                            : <FaUser className="me-2 text-secondary" size={24} />
                                        }
                                        <div className="flex-grow-1">
                                            <div className="fw-bold">{selectedUser.firstName} {selectedUser.lastName}</div>
                                            <div className="small text-muted">{selectedUser.program || 'N/A'} - {selectedUser.year || ''}</div>
                                        </div>
                                        <button className="btn btn-sm btn-close" onClick={() => setSelectedUser(null)}></button>
                                    </div>
                                ) : (
                                    <>
                                        <div className="input-group">
                                            <span className="input-group-text"><FaSearch /></span>
                                            <input type="text" className="form-control" placeholder="Search User (Name/ID)..." value={userQuery} onChange={handleSearchChange} />
                                        </div>
                                        {showUserSearch && searchResults.length > 0 && (
                                            <div className="position-absolute w-100 bg-white shadow rounded mt-1 overflow-auto" style={{zIndex: 1000, maxHeight: '200px'}}>
                                                {searchResults.map(u => (
                                                    <div key={u._id} className="p-2 border-bottom hover-bg-light cursor-pointer d-flex align-items-center" onClick={() => selectUser(u)} style={{cursor:'pointer'}}>
                                                         {u.profileImage ?
                                                            <img src={u.profileImage} className="rounded-circle me-2" style={{width:'30px', height:'30px', objectFit:'cover'}} alt="User"/>
                                                            : <div className="rounded-circle bg-secondary text-white d-flex justify-content-center align-items-center me-2" style={{width:'30px', height:'30px'}}>{u.firstName ? u.firstName[0] : 'U'}</div>
                                                         }
                                                         <div>
                                                             <div className="small fw-bold">{u.firstName} {u.lastName}</div>
                                                             <div className="small text-muted" style={{fontSize: '0.75rem'}}>{u.program} {u.year}</div>
                                                         </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </>
                                )}
                            </div>

                            <div className="flex-grow-1 overflow-auto mb-3" style={{maxHeight: '300px'}}>
                                {cart.length === 0 ? (
                                    <div className="text-center text-muted mt-5">
                                        <FaShoppingBasket className="fa-3x mb-3" />
                                        <p>Cart is empty</p>
                                    </div>
                                ) : (
                                    cart.map(item => (
                                        <div className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded" key={item.cartId}>
                                            <div className="text-truncate me-2" style={{maxWidth: '120px'}}>
                                                <div className="fw-bold small">{item.name}</div>
                                                {item.variant ? (
                                                    <div className="text-muted small" style={{fontSize: '0.75rem'}}>
                                                        {item.variant.size}/{item.variant.color}
                                                    </div>
                                                ) : null}
                                                <div className="text-muted small">₱{item.price}</div>
                                            </div>
                                            <div className="d-flex align-items-center">
                                                <button className="btn btn-sm btn-outline-secondary" onClick={(e) => {e.stopPropagation(); updateQty(item.cartId, -1)}}>-</button>
                                                <span className="mx-2 small fw-bold">{item.quantity}</span>
                                                <button className="btn btn-sm btn-outline-secondary" onClick={(e) => {e.stopPropagation(); updateQty(item.cartId, 1)}}>+</button>
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

            {/* Variant Selection Modal */}
            {showVariantModal && selectedItem && (
                <div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog modal-sm">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title fs-6">Select Options</h5>
                                <button className="btn-close" onClick={() => setShowVariantModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <h6 className="fw-bold">{selectedItem.name}</h6>
                                <div className="mb-3">
                                    <label className="form-label small">Size</label>
                                    <select className="form-select form-select-sm"
                                            onChange={e => {
                                                const sz = e.target.value;
                                                // Filter colors based on size
                                                setVariantSelection({...variantSelection, size: sz, color: '', stock: 0});
                                            }}>
                                        <option value="">Select Size</option>
                                        {[...new Set(selectedItem.variants.map(v => v.size))].map(s => (
                                            <option key={s} value={s}>{s}</option>
                                        ))}
                                    </select>
                                </div>
                                {variantSelection.size && (
                                    <div className="mb-3">
                                        <label className="form-label small">Color</label>
                                        <select className="form-select form-select-sm"
                                                onChange={e => {
                                                    const col = e.target.value;
                                                    const v = selectedItem.variants.find(v => v.size === variantSelection.size && v.color === col);
                                                    setVariantSelection({...variantSelection, color: col, stock: v ? v.stock : 0});
                                                }}>
                                            <option value="">Select Color</option>
                                            {selectedItem.variants.filter(v => v.size === variantSelection.size).map(v => (
                                                <option key={v.color} value={v.color}>{v.color} ({v.stock})</option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-primary btn-sm w-100" onClick={confirmVariantSelection} disabled={!variantSelection.size || !variantSelection.color || variantSelection.stock <= 0}>Add to Cart</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default AdminPOS;
