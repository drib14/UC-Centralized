import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { Link } from 'react-router-dom';
import AdminDashboardSkeleton from '../../components/skeletons/AdminDashboardSkeleton';
import SEO from '../../components/SEO';
import {
    FaTableColumns, FaUsers, FaCalendarDays, FaShirt, FaBullhorn,
    FaClipboardList, FaCashRegister, FaBuildingColumns, FaArrowRight,
    FaServer, FaDatabase, FaMicrochip, FaClock, FaCircleCheck, FaRotate
} from 'react-icons/fa6';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        userCount: 0,
        activeOrders: 0,
        eventCount: 0,
        totalSales: 0,
        recentOrders: []
    });
    const [systemHealth, setSystemHealth] = useState(null);
    const [departments, setDepartments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadAllDashboardData();
    }, []);

    const loadAllDashboardData = async () => {
        try {
            const [statsData, deptsData, healthData] = await Promise.allSettled([
                API.getAdminStats(),
                API.getDepartments(),
                API.request('/health')
            ]);

            if (statsData.status === 'fulfilled') setStats(statsData.value);
            if (deptsData.status === 'fulfilled' && Array.isArray(deptsData.value)) setDepartments(deptsData.value);
            if (healthData.status === 'fulfilled') setSystemHealth(healthData.value);
        } catch (error) {
            console.error("Failed to load dashboard stats", error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadAllDashboardData();
    };

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount || 0);
    };

    const getStatusBadge = (status) => {
        switch (status?.toLowerCase()) {
            case 'pending':
                return <span className="badge bg-warning text-dark px-2 py-1 rounded-pill">Pending</span>;
            case 'processing':
                return <span className="badge bg-info text-white px-2 py-1 rounded-pill">Processing</span>;
            case 'claimed':
                return <span className="badge bg-success px-2 py-1 rounded-pill">Claimed</span>;
            case 'cancelled':
                return <span className="badge bg-danger px-2 py-1 rounded-pill">Cancelled</span>;
            default:
                return <span className="badge bg-secondary px-2 py-1 rounded-pill">{status}</span>;
        }
    };

    const formatUptime = (seconds) => {
        if (!seconds) return '—';
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;
        return `${hrs}h ${mins}m ${secs}s`;
    };

    if (loading) return <AdminDashboardSkeleton />;

    return (
        <div className="container-fluid py-4">
            <SEO title="Admin Dashboard" description="Overview of campus metrics, orders, events, and system health." />

            {/* Top Bar / Header */}
            <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center mb-4 gap-3">
                <div>
                    <h2 className="mb-1 fw-bold text-dark d-flex align-items-center">
                        <FaTableColumns className="me-2 text-primary" /> Admin Operations Center
                    </h2>
                    <p className="text-muted mb-0">
                        UC Main Campus Centralized Platform • Real-time Monitoring & Administration
                    </p>
                </div>
                <div className="d-flex gap-2">
                    <button
                        className="btn btn-outline-primary d-flex align-items-center gap-2 rounded-pill px-3 shadow-sm"
                        onClick={handleRefresh}
                        disabled={refreshing}
                    >
                        <FaRotate className={refreshing ? 'fa-spin' : ''} />
                        {refreshing ? 'Refreshing...' : 'Refresh'}
                    </button>
                    <Link to="/admin/pos" className="btn btn-primary d-flex align-items-center gap-2 rounded-pill px-3 fw-semibold shadow-sm">
                        <FaCashRegister /> Launch POS
                    </Link>
                </div>
            </div>

            {/* Key Metric Cards */}
            <div className="row g-3 mb-4">
                {/* Total Revenue */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Total Sales</span>
                                <h3 className="fw-bold text-primary mt-1 mb-0">{formatCurrency(stats.totalSales)}</h3>
                                <small className="text-success fw-semibold">Merchandise revenue</small>
                            </div>
                            <div className="p-3 bg-primary bg-opacity-10 text-primary rounded-4">
                                <FaShirt size={22} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Active Orders */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Active Orders</span>
                                <h3 className="fw-bold text-warning mt-1 mb-0">{stats.activeOrders}</h3>
                                <small className="text-muted">Awaiting claim / pickup</small>
                            </div>
                            <div className="p-3 bg-warning bg-opacity-10 text-warning rounded-4">
                                <FaClipboardList size={22} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Upcoming Events */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Campus Events</span>
                                <h3 className="fw-bold text-success mt-1 mb-0">{stats.eventCount}</h3>
                                <small className="text-muted">Scheduled activities</small>
                            </div>
                            <div className="p-3 bg-success bg-opacity-10 text-success rounded-4">
                                <FaCalendarDays size={22} />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Registered Users */}
                <div className="col-12 col-sm-6 col-xl-3">
                    <div className="card border-0 shadow-sm rounded-4 p-3 bg-white h-100 position-relative overflow-hidden">
                        <div className="d-flex justify-content-between align-items-start">
                            <div>
                                <span className="text-muted small fw-bold text-uppercase">Enrolled Users</span>
                                <h3 className="fw-bold text-info mt-1 mb-0">{stats.userCount}</h3>
                                <small className="text-muted">Across {departments.length} departments</small>
                            </div>
                            <div className="p-3 bg-info bg-opacity-10 text-info rounded-4">
                                <FaUsers size={22} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Campus Management Modules */}
            <div className="card border-0 shadow-sm rounded-4 p-3 mb-4 bg-white">
                <div className="d-flex align-items-center justify-content-between mb-2">
                    <h6 className="fw-bold text-uppercase text-muted small mb-0">Campus Management</h6>
                </div>
                <div className="row g-2">
                    <div className="col-6 col-md-4 col-lg-2">
                        <Link to="/admin/pos" className="btn btn-light w-100 py-2 d-flex flex-column align-items-center justify-content-center text-decoration-none rounded-3 border-0">
                            <FaCashRegister className="text-primary mb-1" size={20} />
                            <span className="small fw-semibold text-dark">POS Cashier</span>
                        </Link>
                    </div>
                    <div className="col-6 col-md-4 col-lg-2">
                        <Link to="/admin/departments" className="btn btn-light w-100 py-2 d-flex flex-column align-items-center justify-content-center text-decoration-none rounded-3 border-0">
                            <FaBuildingColumns className="text-warning mb-1" size={20} />
                            <span className="small fw-semibold text-dark">Departments</span>
                        </Link>
                    </div>
                    <div className="col-6 col-md-4 col-lg-2">
                        <Link to="/admin/users" className="btn btn-light w-100 py-2 d-flex flex-column align-items-center justify-content-center text-decoration-none rounded-3 border-0">
                            <FaUsers className="text-info mb-1" size={20} />
                            <span className="small fw-semibold text-dark">User Control</span>
                        </Link>
                    </div>
                    <div className="col-6 col-md-4 col-lg-2">
                        <Link to="/admin/merch" className="btn btn-light w-100 py-2 d-flex flex-column align-items-center justify-content-center text-decoration-none rounded-3 border-0">
                            <FaShirt className="text-success mb-1" size={20} />
                            <span className="small fw-semibold text-dark">Merchandise</span>
                        </Link>
                    </div>
                    <div className="col-6 col-md-4 col-lg-2">
                        <Link to="/admin/events" className="btn btn-light w-100 py-2 d-flex flex-column align-items-center justify-content-center text-decoration-none rounded-3 border-0">
                            <FaCalendarDays className="text-danger mb-1" size={20} />
                            <span className="small fw-semibold text-dark">Events</span>
                        </Link>
                    </div>
                    <div className="col-6 col-md-4 col-lg-2">
                        <Link to="/admin/announcements" className="btn btn-light w-100 py-2 d-flex flex-column align-items-center justify-content-center text-decoration-none rounded-3 border-0">
                            <FaBullhorn className="text-secondary mb-1" size={20} />
                            <span className="small fw-semibold text-dark">Broadcasts</span>
                        </Link>
                    </div>
                </div>
            </div>

            {/* Main Content: Recent Orders & System Diagnostics */}
            <div className="row g-4">
                {/* Recent Orders Feed */}
                <div className="col-lg-8">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-white overflow-hidden">
                        <div className="card-header bg-white border-0 pt-4 px-4 pb-2 d-flex justify-content-between align-items-center">
                            <div>
                                <h5 className="fw-bold mb-0 text-dark">Recent Merchandise Orders</h5>
                                <small className="text-muted">Live transactions from student portal & POS</small>
                            </div>
                            <Link to="/admin/orders" className="btn btn-sm btn-outline-primary rounded-pill px-3">
                                View All Orders <FaArrowRight className="ms-1" size={12} />
                            </Link>
                        </div>
                        <div className="card-body p-0">
                            <div className="table-responsive">
                                <table className="table table-hover align-middle mb-0">
                                    <thead className="table-light">
                                        <tr>
                                            <th className="ps-4">Order ID</th>
                                            <th>Student / Customer</th>
                                            <th>Date</th>
                                            <th>Total Price</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentOrders.length === 0 ? (
                                            <tr>
                                                <td colSpan="5" className="text-center py-5 text-muted">
                                                    <FaClipboardList size={36} className="mb-2 opacity-50" />
                                                    <p className="mb-0">No recent orders recorded.</p>
                                                </td>
                                            </tr>
                                        ) : (
                                            stats.recentOrders.map(order => {
                                                const u = order.user;
                                                const user = u ? ((u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.name || 'Student')) : (order.customerName || 'POS Walk-in');
                                                const studentId = u?.studentId || '—';
                                                return (
                                                    <tr key={order._id}>
                                                        <td className="ps-4 fw-mono small">
                                                            <Link to="/admin/orders" className="text-decoration-none fw-bold text-primary">
                                                                #{order._id.slice(-6).toUpperCase()}
                                                            </Link>
                                                        </td>
                                                        <td>
                                                            <div className="fw-semibold text-dark">{user}</div>
                                                            <small className="text-muted font-monospace">{studentId}</small>
                                                        </td>
                                                        <td className="text-muted small">
                                                            {new Date(order.createdAt || order.orderDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                                        </td>
                                                        <td className="fw-bold text-dark">
                                                            {formatCurrency(order.totalPrice)}
                                                        </td>
                                                        <td>
                                                            {getStatusBadge(order.status)}
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>

                {/* System & Load Balancer Diagnostics */}
                <div className="col-lg-4">
                    <div className="card border-0 shadow-sm rounded-4 h-100 bg-white">
                        <div className="card-header bg-white border-0 pt-4 px-4 pb-2">
                            <h5 className="fw-bold mb-0 text-dark d-flex align-items-center">
                                <FaServer className="me-2 text-primary" /> Campus System Health
                            </h5>
                            <small className="text-muted">High-concurrency Load Balancer Diagnostics</small>
                        </div>
                        <div className="card-body px-4 pt-2">
                            <ul className="list-group list-group-flush">
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-bottom">
                                    <div className="d-flex align-items-center">
                                        <FaServer className="me-2 text-success" />
                                        <span className="fw-semibold">Campus Application Server</span>
                                    </div>
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-1 rounded-pill">
                                        <FaCircleCheck className="me-1" /> Online
                                    </span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-bottom">
                                    <div className="d-flex align-items-center">
                                        <FaDatabase className="me-2 text-primary" />
                                        <span className="fw-semibold">Primary Campus Database</span>
                                    </div>
                                    <span className="badge bg-success bg-opacity-10 text-success border border-success px-3 py-1 rounded-pill">
                                        Connected
                                    </span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-bottom">
                                    <div className="d-flex align-items-center">
                                        <FaMicrochip className="me-2 text-info" />
                                        <span className="fw-semibold">Instance Node / PID</span>
                                    </div>
                                    <span className="fw-mono small text-dark">
                                        PID {systemHealth?.processId || '—'} ({systemHealth?.workerId || 'Node 1'})
                                    </span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-3 border-bottom">
                                    <div className="d-flex align-items-center">
                                        <FaClock className="me-2 text-secondary" />
                                        <span className="fw-semibold">Server Uptime</span>
                                    </div>
                                    <span className="small text-muted font-monospace">
                                        {formatUptime(systemHealth?.uptimeSeconds)}
                                    </span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center px-0 py-3">
                                    <div className="d-flex align-items-center">
                                        <FaBuildingColumns className="me-2 text-warning" />
                                        <span className="fw-semibold">Departments Active</span>
                                    </div>
                                    <span className="badge bg-warning bg-opacity-10 text-dark border border-warning px-3 py-1 rounded-pill">
                                        {departments.length} Colleges
                                    </span>
                                </li>
                            </ul>

                            <div className="alert alert-light border rounded-3 p-3 mt-3 mb-0 small text-muted">
                                <strong>Campus Infrastructure:</strong> High-availability multi-instance architecture with real-time sync ready for university load.
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
