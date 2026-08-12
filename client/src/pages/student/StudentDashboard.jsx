import React, { useEffect, useState } from 'react';
import UniversalSkeleton from '../../components/skeletons/UniversalSkeleton';
import API from '../../utils/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import SEO from '../../components/SEO';
import {
    FaBullhorn, FaCalendarDays, FaShirt, FaLocationDot,
    FaClock, FaPlus, FaArrowRight, FaCartShopping,
    FaGraduationCap, FaCircleCheck
} from 'react-icons/fa6';

const StudentDashboard = () => {
    const { user } = useAuth();
    const { addItem } = useCart();
    const [announcements, setAnnouncements] = useState([]);
    const [departments, setDepartments] = useState([]);

    // Event Categories
    const [latestEvent, setLatestEvent] = useState(null); // Today
    const [upcomingEvents, setUpcomingEvents] = useState([]); // Future
    const [recentEvents, setRecentEvents] = useState([]); // Past

    const [merch, setMerch] = useState([]);
    const [loading, setLoading] = useState(true);

    // Merch Variant Selection State (Map of itemID -> {size, color})
    const [selections, setSelections] = useState({});

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [annRes, evRes, merchRes, deptRes] = await Promise.allSettled([
                    API.getAnnouncements(),
                    API.getEvents(),
                    API.getMerch(),
                    API.getDepartments()
                ]);

                if (annRes.status === 'fulfilled' && Array.isArray(annRes.value)) {
                    setAnnouncements(annRes.value);
                }

                if (deptRes.status === 'fulfilled' && Array.isArray(deptRes.value)) {
                    setDepartments(deptRes.value);
                }

                // Events Logic
                if (evRes.status === 'fulfilled' && Array.isArray(evRes.value)) {
                    const eventData = evRes.value;
                    const now = new Date();

                    const todayEvents = [];
                    const upcoming = [];
                    const past = [];

                    eventData.forEach(event => {
                        if (!event.date) return;
                        const startDate = new Date(event.date);
                        const endDate = event.endDate ? new Date(event.endDate) : new Date(event.date);

                        const startTimeParts = (event.time || '00:00').split(':');
                        startDate.setHours(startTimeParts[0], startTimeParts[1]);

                        const endTimeParts = (event.endTime || '23:59').split(':');
                        endDate.setHours(endTimeParts[0], endTimeParts[1]);

                        if (now >= startDate && now <= endDate) {
                            todayEvents.push(event);
                        } else if (now < startDate) {
                            upcoming.push(event);
                        } else {
                            past.push(event);
                        }
                    });

                    setLatestEvent(todayEvents.length > 0 ? todayEvents[0] : null);
                    setUpcomingEvents(upcoming.sort((a, b) => a.date.localeCompare(b.date)));
                    setRecentEvents(past.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4));
                }

                // Top Merch of the Week
                if (merchRes.status === 'fulfilled' && Array.isArray(merchRes.value)) {
                    const allMerch = merchRes.value;
                    setMerch(allMerch.slice(0, 4));
                }
            } catch (error) {
                console.error("Dashboard data error", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSelectionChange = (itemId, field, value) => {
        setSelections(prev => {
            const newItemState = { ...prev[itemId], [field]: value };
            if (field === 'size') newItemState.color = '';
            return { ...prev, [itemId]: newItemState };
        });
    };

    const addToCart = (item) => {
        if (item.category === 'wearable' && item.variants && item.variants.length > 0) {
            const sel = selections[item._id] || {};
            if (!sel.size || !sel.color) {
                return toast.error("Please select a size and color");
            }

            const variant = item.variants.find(v => v.size === sel.size && v.color === sel.color);
            if (!variant || variant.stock <= 0) {
                return toast.error("Selected item variant is out of stock");
            }

            const success = addItem(item, variant);
            if (success) toast.success(`Added ${item.name} (${sel.size}, ${sel.color}) to cart`);
            else toast.error("Could not add to cart (Stock limit reached)");
        } else {
            if (item.stock <= 0) return toast.error("Item is out of stock");
            const success = addItem(item, null);
            if (success) toast.success(`Added ${item.name} to cart`);
            else toast.error("Could not add to cart (Stock limit reached)");
        }
    };

    const getVariantStock = (item) => {
        if (item.category !== 'wearable') return item.stock;
        const sel = selections[item._id];
        if (!sel || !sel.size || !sel.color) return null;
        const v = item.variants.find(varItem => varItem.size === sel.size && varItem.color === sel.color);
        return v ? v.stock : 0;
    };

    const getAvailableColors = (item) => {
        const sel = selections[item._id] || {};
        if (!sel.size) {
            return [...new Set(item.variants.map(v => v.color))];
        }
        return item.variants.filter(v => v.size === sel.size).map(v => v.color);
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    const formatTime = (timeStr) => {
        if (!timeStr) return 'All Day';
        const [hour, minute] = timeStr.split(':');
        const h = parseInt(hour, 10);
        const m = parseInt(minute, 10);
        if (isNaN(h) || isNaN(m)) return timeStr;
        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHour = h % 12 || 12;
        const formattedMinute = m < 10 ? `0${m}` : m;
        return `${formattedHour}:${formattedMinute} ${ampm}`;
    };

    const studentName = user ? ((user.firstName && user.lastName) ? `${user.firstName} ${user.lastName}` : (user.name || 'Student')) : 'Student';
    const userDept = user?.department || 'CCS';
    const deptMatch = departments.find(d => d.code === userDept);

    if (loading) return <UniversalSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Student Portal" description="Campus updates, official announcements, merchandise, and scheduled events." />

            {/* Personalized Welcome Banner */}
            <div className="card border-0 shadow-sm rounded-4 p-4 mb-4 bg-white position-relative overflow-hidden">
                <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3">
                    <div className="d-flex align-items-center gap-3">
                        <div
                            className="rounded-circle d-flex align-items-center justify-content-center text-white fw-bold shadow-sm"
                            style={{
                                width: '56px',
                                height: '56px',
                                fontSize: '20px',
                                backgroundColor: deptMatch?.color || '#003399'
                            }}
                        >
                            {user?.profileImage ? (
                                <img src={user.profileImage} alt={studentName} className="rounded-circle w-100 h-100 object-fit-cover" />
                            ) : (
                                ((user?.firstName ? user.firstName[0] : '') + (user?.lastName ? user.lastName[0] : '')).toUpperCase() || 'S'
                            )}
                        </div>
                        <div>
                            <h3 className="fw-bold mb-1 text-dark">Welcome back, {studentName}!</h3>
                            <div className="d-flex flex-wrap align-items-center gap-2 small text-muted">
                                <span className="badge text-white px-3 py-1 rounded-pill" style={{ backgroundColor: deptMatch?.color || '#003399' }}>
                                    <FaGraduationCap className="me-1" /> {userDept} • {deptMatch?.name || 'Department'}
                                </span>
                                {user?.studentId && (
                                    <span className="badge bg-light text-dark border font-monospace px-2 py-1">
                                        ID: {user.studentId}
                                    </span>
                                )}
                                {user?.program && (
                                    <span className="text-secondary fw-semibold">
                                        {user.program} • Year {user.year || '1'}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="d-flex gap-2">
                        <Link to="/student/merch" className="btn btn-primary d-flex align-items-center gap-2 rounded-pill px-3 fw-semibold shadow-sm">
                            <FaShirt /> Campus Store
                        </Link>
                        <Link to="/student/cart" className="btn btn-outline-primary d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm">
                            <FaCartShopping /> My Cart
                        </Link>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                {/* Main Left Content: Announcements & Merch Showcase */}
                <div className="col-lg-8">
                    {/* Campus Announcements */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="fw-bold text-dark mb-0 d-flex align-items-center">
                            <FaBullhorn className="me-2 text-primary" /> Campus Announcements
                        </h4>
                    </div>

                    <div className="mb-4">
                        {announcements.length === 0 ? (
                            <div className="card border-0 shadow-sm rounded-4 p-4 text-center text-muted bg-white">
                                <FaBullhorn size={32} className="mb-2 opacity-25" />
                                <p className="mb-0">No active announcements at this time.</p>
                            </div>
                        ) : (
                            announcements.slice(0, 3).map((ann, i) => {
                                const annDept = departments.find(d => d.code === ann.department);
                                return (
                                    <div className="card border-0 shadow-sm rounded-4 mb-3 bg-white hover-shadow" key={i}>
                                        <div className="card-body p-4">
                                            <div className="d-flex align-items-center gap-2 mb-2">
                                                <span
                                                    className="badge px-3 py-1 rounded-pill text-white fw-bold"
                                                    style={{ backgroundColor: ann.department === 'ALL' ? '#0d6efd' : (annDept?.color || '#003399') }}
                                                >
                                                    {ann.department === 'ALL' ? 'Campus-Wide' : ann.department}
                                                </span>
                                                <span className="text-muted small">
                                                    {new Date(ann.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                                                </span>
                                            </div>
                                            <h5 className="card-title fw-bold text-dark mb-2">{ann.title}</h5>
                                            <p className="card-text text-secondary mb-0" style={{ whiteSpace: 'pre-line' }}>{ann.message}</p>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </div>

                    {/* Fresh Campus Merchandise */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h4 className="fw-bold text-dark mb-0 d-flex align-items-center">
                            <FaShirt className="me-2 text-primary" /> Official Campus Merchandise
                        </h4>
                        <Link to="/student/merch" className="btn btn-sm btn-outline-primary rounded-pill px-3">
                            View All <FaArrowRight className="ms-1" size={12} />
                        </Link>
                    </div>

                    <div className="row g-3 mb-4">
                        {merch.length === 0 ? (
                            <div className="col-12">
                                <div className="card border-0 shadow-sm rounded-4 p-4 text-center text-muted bg-white">
                                    <p className="mb-0">No merchandise items currently available.</p>
                                </div>
                            </div>
                        ) : (
                            merch.map(item => (
                                <div className="col-md-6" key={item._id}>
                                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-white hover-shadow overflow-hidden">
                                        <div className="row g-0 h-100">
                                            <div className="col-4">
                                                <img
                                                    src={item.image || 'https://via.placeholder.com/150'}
                                                    className="w-100 h-100 object-fit-cover"
                                                    alt={item.name}
                                                    style={{ minHeight: '140px' }}
                                                />
                                            </div>
                                            <div className="col-8">
                                                <div className="card-body p-3 d-flex flex-column h-100">
                                                    <h6 className="card-title fw-bold text-dark text-truncate mb-1">{item.name}</h6>
                                                    <div className="fw-bold text-primary mb-2">{formatCurrency(item.price)}</div>

                                                    {/* Variant Selectors */}
                                                    {item.category === 'wearable' && item.variants && item.variants.length > 0 && (
                                                        <div className="mb-2">
                                                            <div className="d-flex gap-1 mb-1">
                                                                <select
                                                                    className="form-select form-select-sm"
                                                                    onChange={(e) => handleSelectionChange(item._id, 'size', e.target.value)}
                                                                    value={selections[item._id]?.size || ''}
                                                                >
                                                                    <option value="">Size</option>
                                                                    {[...new Set(item.variants.map(v => v.size))].map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                                <select
                                                                    className="form-select form-select-sm"
                                                                    onChange={(e) => handleSelectionChange(item._id, 'color', e.target.value)}
                                                                    value={selections[item._id]?.color || ''}
                                                                >
                                                                    <option value="">Color</option>
                                                                    {getAvailableColors(item).map(c => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            </div>
                                                            {selections[item._id]?.size && selections[item._id]?.color && (
                                                                <small className="text-muted d-block" style={{ fontSize: '0.75rem' }}>
                                                                    Available: {getVariantStock(item)} units
                                                                </small>
                                                            )}
                                                        </div>
                                                    )}

                                                    {item.category !== 'wearable' && (
                                                        <small className="text-muted mb-2 d-block">
                                                            {item.stock > 0 ? `${item.stock} in stock` : 'Out of Stock'}
                                                        </small>
                                                    )}

                                                    <button
                                                        className="btn btn-sm btn-outline-primary rounded-pill mt-auto w-100 fw-semibold d-flex align-items-center justify-content-center gap-1"
                                                        onClick={() => addToCart(item)}
                                                    >
                                                        <FaPlus size={10} /> Add to Cart
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Side Column: Events Schedule */}
                <div className="col-lg-4">
                    {/* Happening Today */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                            <FaCalendarDays className="me-2 text-warning" /> Happening Today
                        </h5>
                    </div>

                    {latestEvent ? (
                        <div className="card border-0 shadow-sm rounded-4 mb-4 bg-white overflow-hidden">
                            {latestEvent.image && (
                                <img
                                    src={latestEvent.image}
                                    className="card-img-top object-fit-cover"
                                    alt={latestEvent.title}
                                    style={{ height: '160px' }}
                                />
                            )}
                            <div className="card-body p-4">
                                <span className="badge bg-warning text-dark px-3 py-1 rounded-pill mb-2 fw-semibold">
                                    Today's Activity
                                </span>
                                <h5 className="card-title fw-bold text-dark mb-2">{latestEvent.title}</h5>
                                <div className="text-muted small mb-2 d-flex align-items-center gap-2">
                                    <FaClock size={12} />
                                    <span>{formatTime(latestEvent.time)}</span>
                                </div>
                                <div className="text-secondary small mb-3 d-flex align-items-center gap-2">
                                    <FaLocationDot size={12} className="text-danger" />
                                    <span>{latestEvent.location}</span>
                                </div>
                                <Link to="/student/events" className="btn btn-warning btn-sm rounded-pill w-100 fw-semibold">
                                    View Event Details
                                </Link>
                            </div>
                        </div>
                    ) : (
                        <div className="card border-0 shadow-sm rounded-4 p-4 text-center text-muted mb-4 bg-white">
                            <FaClock size={28} className="mb-2 opacity-25" />
                            <p className="small mb-0">No events scheduled for today.</p>
                        </div>
                    )}

                    {/* Upcoming Events */}
                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <h5 className="fw-bold text-dark mb-0 d-flex align-items-center">
                            <FaCalendarDays className="me-2 text-primary" /> Upcoming Events
                        </h5>
                        <Link to="/student/events" className="small text-decoration-none fw-semibold">
                            Full Calendar
                        </Link>
                    </div>

                    <div className="mb-4">
                        {upcomingEvents.length === 0 ? (
                            <div className="card border-0 shadow-sm rounded-4 p-4 text-center text-muted bg-white">
                                <p className="small mb-0">No upcoming events scheduled.</p>
                            </div>
                        ) : (
                            upcomingEvents.slice(0, 3).map((ev, i) => (
                                <div className="card border-0 shadow-sm rounded-4 mb-2 bg-white p-3 hover-shadow" key={i}>
                                    <div className="d-flex align-items-center gap-3">
                                        <div className="rounded-3 bg-primary bg-opacity-10 text-primary p-2 text-center" style={{ minWidth: '50px' }}>
                                            <small className="d-block fw-bold" style={{ fontSize: '10px' }}>
                                                {new Date(ev.date).toLocaleDateString(undefined, { month: 'short' }).toUpperCase()}
                                            </small>
                                            <span className="fw-bold fs-6">
                                                {new Date(ev.date).getDate()}
                                            </span>
                                        </div>
                                        <div className="flex-grow-1 overflow-hidden">
                                            <h6 className="fw-bold text-dark text-truncate mb-1">{ev.title}</h6>
                                            <small className="text-muted d-flex align-items-center gap-1">
                                                <FaLocationDot size={10} className="text-danger" /> {ev.location}
                                            </small>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Past Activities */}
                    {recentEvents.length > 0 && (
                        <div>
                            <h6 className="text-muted fw-bold text-uppercase small mb-2">Past Activities</h6>
                            {recentEvents.map((ev, i) => (
                                <div className="card border-0 rounded-3 mb-2 bg-light p-2" key={i}>
                                    <div className="d-flex justify-content-between align-items-center">
                                        <small className="fw-semibold text-secondary text-truncate me-2">{ev.title}</small>
                                        <small className="text-muted font-monospace" style={{ fontSize: '11px' }}>{ev.date}</small>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
