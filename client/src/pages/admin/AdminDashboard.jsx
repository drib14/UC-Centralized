import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { Link } from 'react-router-dom';
import AdminDashboardSkeleton from '../../components/skeletons/AdminDashboardSkeleton';
import SEO from '../../components/SEO';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        userCount: 0,
        activeOrders: 0,
        eventCount: 0,
        totalSales: 0,
        recentOrders: []
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchStats = async () => {
            try {
                const data = await API.getAdminStats();
                setStats(data);
            } catch (error) {
                console.error("Failed to load stats", error);
            } finally {
                setLoading(false);
            }
        };

        fetchStats();
    }, []);

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    const getStatusBadge = (status) => {
        const map = {
            'pending': 'bg-warning text-dark',
            'processing': 'bg-info text-white',
            'claimed': 'bg-success',
            'cancelled': 'bg-danger'
        };
        return <span className={`badge ${map[status] || 'bg-secondary'}`}>{status.toUpperCase()}</span>;
    };

    if (loading) return <AdminDashboardSkeleton />;

    return (
        <div className="container-fluid">
            <SEO title="Admin Dashboard" description="Overview of system statistics and activities." />
            <h2 className="mb-4">Admin Dashboard</h2>

            <div className="row g-4 mb-4">
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card bg-primary text-white h-100">
                        <div className="card-body">
                            <h6 className="card-title">Total Sales</h6>
                            <h2 className="fw-bold">{formatCurrency(stats.totalSales)}</h2>
                            <small>Revenue (Claimed)</small>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card bg-success text-white h-100">
                        <div className="card-body">
                            <h6 className="card-title">Active Orders</h6>
                            <h2 className="fw-bold">{stats.activeOrders}</h2>
                            <small>Pending/Processing</small>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card bg-warning text-dark h-100">
                        <div className="card-body">
                            <h6 className="card-title">Upcoming Events</h6>
                            <h2 className="fw-bold">{stats.eventCount}</h2>
                            <small>Future events</small>
                        </div>
                    </div>
                </div>
                <div className="col-12 col-sm-6 col-lg-3">
                    <div className="card bg-info text-white h-100">
                        <div className="card-body">
                            <h6 className="card-title">Registered Users</h6>
                            <h2 className="fw-bold">{stats.userCount}</h2>
                            <small>Students enrolled</small>
                        </div>
                    </div>
                </div>
            </div>

            <div className="row g-4">
                <div className="col-lg-8">
                    <div className="card h-100">
                        <div className="card-header bg-light text-dark">Recent Orders</div>
                        <div className="card-body">
                            <div className="table-responsive">
                                <table className="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>Order ID</th>
                                            <th>Student</th>
                                            <th>Amount</th>
                                            <th>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {stats.recentOrders.length === 0 ? (
                                            <tr><td colSpan="4" className="text-center text-muted">No recent orders</td></tr>
                                        ) : (
                                            stats.recentOrders.map(order => {
                                                const u = order.user;
                                                const user = u ? ((u.firstName && u.lastName) ? `${u.firstName} ${u.lastName}` : (u.name || 'Unknown User')) : (order.customerName || 'Unknown');
                                                return (
                                                    <tr key={order._id}>
                                                        <td>#{order._id.slice(-6).toUpperCase()}</td>
                                                        <td>{user}</td>
                                                        <td>{formatCurrency(order.totalPrice)}</td>
                                                        <td>{getStatusBadge(order.status)}</td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <Link to="/admin/orders" className="btn btn-sm btn-outline-primary w-100">View All Orders</Link>
                        </div>
                    </div>
                </div>
                <div className="col-lg-4">
                    <div className="card h-100">
                        <div className="card-header bg-light text-dark">System Status</div>
                        <div className="card-body">
                            <ul className="list-group list-group-flush">
                                <li className="list-group-item d-flex justify-content-between align-items-center">
                                    Server Status
                                    <span className="badge bg-success rounded-pill">Online</span>
                                </li>
                                <li className="list-group-item d-flex justify-content-between align-items-center">
                                    Database
                                    <span className="badge bg-success rounded-pill">Connected</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
