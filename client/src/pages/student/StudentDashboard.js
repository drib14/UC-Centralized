import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { useCart } from '../../context/CartContext';
import { FaBullhorn, FaCalendar, FaTshirt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';

const StudentDashboard = () => {
    const { addItem } = useCart();
    const [announcements, setAnnouncements] = useState([]);
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
                const results = await Promise.allSettled([
                    API.getAnnouncements(),
                    API.getEvents(),
                    API.getMerch()
                ]);

                // Announcements
                if (results[0].status === 'fulfilled') setAnnouncements(results[0].value);

                // Events Logic
                if (results[1].status === 'fulfilled') {
                    const eventData = results[1].value;
                    const now = new Date();
                    const todayStr = now.toISOString().split('T')[0];

                    const todayEvents = [];
                    const upcoming = [];
                    const past = [];

                    eventData.forEach(event => {
                        const eventDateStr = event.date; // Start Date
                        if (!eventDateStr) return;

                        // Construct Event Range
                        const startDate = new Date(event.date);
                        const endDate = event.endDate ? new Date(event.endDate) : new Date(event.date);

                        // Add time to start/end for precise check
                        const startTimeParts = (event.time || '00:00').split(':');
                        startDate.setHours(startTimeParts[0], startTimeParts[1]);

                        const endTimeParts = (event.endTime || '23:59').split(':');
                        endDate.setHours(endTimeParts[0], endTimeParts[1]);

                        // Classification Logic
                        if (now >= startDate && now <= endDate) {
                            // Happening Now (Today/Range)
                            todayEvents.push(event);
                        } else if (now < startDate) {
                            // Upcoming
                            upcoming.push(event);
                        } else {
                            // Past
                            past.push(event);
                        }
                    });

                    // "Latest Event" is specifically Happening Now/Today
                    setLatestEvent(todayEvents.length > 0 ? todayEvents[0] : null);
                    setUpcomingEvents(upcoming.sort((a,b) => a.date.localeCompare(b.date))); // Ascending
                    setRecentEvents(past.sort((a,b) => b.date.localeCompare(a.date)).slice(0, 5)); // Descending, top 5
                }

                // Merch Logic - Top Merch of the Week
                if (results[2].status === 'fulfilled') {
                    const allMerch = results[2].value;
                    const oneWeekAgo = new Date();
                    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

                    const newMerch = allMerch.filter(m => {
                        // Use updatedAt to capture restocks/updates too, as requested
                        const created = new Date(m.createdAt);
                        const updated = new Date(m.updatedAt);
                        return created >= oneWeekAgo || updated >= oneWeekAgo;
                    });

                    setMerch(newMerch.slice(0, 4)); // Top 4
                }

            } catch (error) {
                console.error("Dashboard error", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const handleSelectionChange = (itemId, field, value) => {
        setSelections(prev => {
            // If changing size, reset color to ensure valid combo
            const newItemState = { ...prev[itemId], [field]: value };
            if (field === 'size') newItemState.color = '';
            return { ...prev, [itemId]: newItemState };
        });
    };

    const addToCart = (item) => {
        if (item.category === 'wearable' && item.variants && item.variants.length > 0) {
            const sel = selections[item._id] || {};
            if (!sel.size || !sel.color) return toast.error("Please select size and color");

            const variant = item.variants.find(v => v.size === sel.size && v.color === sel.color);
            if (!variant || variant.stock <= 0) return toast.error("Selected item out of stock");

            const success = addItem(item, variant);
            if (success) toast.success(`Added ${item.name} (${sel.size}, ${sel.color}) to cart!`);
            else toast.error("Could not add to cart (Stock limit reached)");
        } else {
            if (item.stock <= 0) return toast.error("Out of stock");
            const success = addItem(item, null);
            if (success) toast.success(`Added ${item.name} to cart!`);
            else toast.error("Could not add to cart (Stock limit reached)");
        }
    };

    // Helper to get stock display
    const getVariantStock = (item) => {
        if (item.category !== 'wearable') return item.stock;
        const sel = selections[item._id];
        if (!sel || !sel.size || !sel.color) return null;
        const v = item.variants.find(varItem => varItem.size === sel.size && varItem.color === sel.color);
        return v ? v.stock : 0;
    };

    // Helper to get available colors based on size selection
    const getAvailableColors = (item) => {
        const sel = selections[item._id] || {};
        if (!sel.size) {
            // If no size selected, show ALL unique colors available for this item
            return [...new Set(item.variants.map(v => v.color))];
        }
        // If size selected, show colors for that size
        return item.variants.filter(v => v.size === sel.size).map(v => v.color);
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

    if (loading) {
        return (
            <div className="text-center my-5">
                <div className="spinner-border text-success" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            {/* Welcome Section */}
            <div className="row mb-4">
                <div className="col-12">
                    <div className="p-4 mb-4 bg-light rounded-3 border-start border-5 border-success">
                        <h1 className="display-6 fw-bold text-success">Welcome back!</h1>
                        <p className="fs-5">Check out the latest updates.</p>
                    </div>
                </div>
            </div>

            <div className="row">
                <div className="col-lg-8">
                    {/* Announcements */}
                    <h4 className="mb-3 text-success"><FaBullhorn className="me-2" />Announcements</h4>
                    <div className="mb-5">
                        {announcements.length === 0 ? <p className="text-muted">No announcements.</p> : (
                            announcements.slice(0, 3).map((ann, i) => (
                                <div className="card mb-3 shadow-sm" key={i}>
                                    <div className="card-body">
                                        <h5 className="card-title">{ann.title}</h5>
                                        <h6 className="card-subtitle mb-2 text-muted small">
                                            {new Date(ann.createdAt).toLocaleDateString()} | {ann.department}
                                        </h6>
                                        <p className="card-text">{ann.message}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Latest Merch Section */}
                    <h4 className="mb-3 text-success"><FaTshirt className="me-2" />Fresh Merch (This Week)</h4>
                    <div className="row mb-5">
                        {merch.length === 0 ? <p className="text-muted ms-3">No new merch this week.</p> : (
                            merch.map(item => (
                                <div className="col-md-6 mb-4" key={item._id}>
                                    <div className="card h-100">
                                        <div className="row g-0 h-100">
                                            <div className="col-md-4">
                                                <img src={item.image || 'https://via.placeholder.com/150'} className="img-fluid rounded-start h-100" style={{objectFit:'cover'}} alt={item.name} />
                                            </div>
                                            <div className="col-md-8">
                                                <div className="card-body d-flex flex-column h-100">
                                                    <h5 className="card-title text-truncate">{item.name}</h5>
                                                    <p className="card-text fw-bold text-primary mb-1">₱{item.price}</p>

                                                    {/* Variant Selectors */}
                                                    {item.category === 'wearable' && item.variants && (
                                                        <div className="mb-2">
                                                            <div className="d-flex gap-2 mb-1">
                                                                <select className="form-select form-select-sm"
                                                                        onChange={(e) => handleSelectionChange(item._id, 'size', e.target.value)}
                                                                        value={selections[item._id]?.size || ''}>
                                                                    <option value="">Size</option>
                                                                    {[...new Set(item.variants.map(v => v.size))].map(s => <option key={s} value={s}>{s}</option>)}
                                                                </select>
                                                                <select className="form-select form-select-sm"
                                                                        onChange={(e) => handleSelectionChange(item._id, 'color', e.target.value)}
                                                                        value={selections[item._id]?.color || ''}>
                                                                    <option value="">Color</option>
                                                                    {getAvailableColors(item).map(c => <option key={c} value={c}>{c}</option>)}
                                                                </select>
                                                            </div>
                                                            {selections[item._id]?.size && selections[item._id]?.color && (
                                                                <small className="text-muted d-block mb-1">Available: {getVariantStock(item)}</small>
                                                            )}
                                                        </div>
                                                    )}

                                                    {item.category !== 'wearable' && (
                                                        <p className="card-text small text-muted mb-2">Available: {item.stock}</p>
                                                    )}

                                                    <button className="btn btn-sm btn-outline-success mt-auto w-100" onClick={() => addToCart(item)}>Add to Cart</button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

                <div className="col-lg-4">
                    {/* Latest Event (Happening Now) */}
                    <h4 className="mb-3 text-warning"><FaCalendar className="me-2" />Happening Today</h4>
                    {latestEvent ? (
                        <div className="card border-warning mb-4 shadow-sm">
                            {latestEvent.image && (
                                <img src={latestEvent.image} className="card-img-top" alt={latestEvent.title} style={{ height: '180px', objectFit: 'cover' }} />
                            )}
                            <div className="card-body">
                                <h5 className="card-title fw-bold">{latestEvent.title}</h5>
                                <p className="card-text text-muted mb-1"><i className="fa-regular fa-clock me-1"></i>{formatTime(latestEvent.time)}</p>
                                <p className="card-text small">{latestEvent.location}</p>
                                <Link to="/student/events" className="btn btn-warning btn-sm w-100">View Details</Link>
                            </div>
                        </div>
                    ) : (
                        <p className="text-muted mb-4">No events happening right now.</p>
                    )}

                    {/* Upcoming Events */}
                    <h4 className="mb-3 text-primary"><FaCalendar className="me-2" />Upcoming Events</h4>
                    <div className="mb-4">
                        {upcomingEvents.length === 0 ? <p className="text-muted">No upcoming events.</p> : (
                            upcomingEvents.map((ev, i) => (
                                <div className="card mb-3 border-0 shadow-sm" key={i}>
                                    <div className="row g-0">
                                        <div className="col-4">
                                            <img src={ev.image || 'https://via.placeholder.com/100'} className="img-fluid rounded-start h-100" style={{objectFit:'cover', minHeight:'80px'}} alt={ev.title} />
                                        </div>
                                        <div className="col-8">
                                            <div className="card-body py-2 px-3">
                                                <h6 className="fw-bold mb-1 small">{ev.title}</h6>
                                                <small className="text-muted d-block" style={{fontSize:'0.75rem'}}>{ev.date}</small>
                                                <small className="text-muted" style={{fontSize:'0.75rem'}}>{ev.location}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Recent Events (Past) */}
                    <h4 className="mb-3 text-secondary"><FaCalendar className="me-2" />Recent Events</h4>
                    <div>
                        {recentEvents.length === 0 ? <p className="text-muted">No recent events.</p> : (
                            recentEvents.map((ev, i) => (
                                <div className="card mb-3 border-0 bg-light" key={i}>
                                    <div className="row g-0">
                                        <div className="col-4">
                                            <img src={ev.image || 'https://via.placeholder.com/100'} className="img-fluid rounded-start h-100" style={{objectFit:'cover', minHeight:'80px', filter: 'grayscale(100%)'}} alt={ev.title} />
                                        </div>
                                        <div className="col-8">
                                            <div className="card-body py-2 px-3">
                                                <h6 className="fw-bold mb-1 small text-muted">{ev.title}</h6>
                                                <small className="text-muted d-block" style={{fontSize:'0.75rem'}}>Ended: {ev.date}</small>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudentDashboard;
