import React, { useEffect, useState } from 'react';
import API from '../../utils/api';
import { FaUsers, FaCalendarDays, FaShirt, FaClipboardList } from 'react-icons/fa6';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        users: 0,
        events: 0,
        merch: 0,
        orders: 0
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

    if (loading) {
        return (
            <div className="text-center my-5">
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            </div>
        );
    }

    return (
        <div className="container-fluid">
            <h1 className="h3 mb-4 text-gray-800">Dashboard</h1>

            <div className="row">
                <div className="col-xl-3 col-md-6 mb-4">
                    <div className="card shadow h-100 py-2 border-primary border-4 border-end-0 border-top-0 border-bottom-0 border-start">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                                        Total Users</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.users}</div>
                                </div>
                                <div className="col-auto">
                                    <FaUsers className="text-gray-300 fa-2x opacity-25" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                    <div className="card shadow h-100 py-2 border-success border-4 border-end-0 border-top-0 border-bottom-0 border-start">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                                        Total Events</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.events}</div>
                                </div>
                                <div className="col-auto">
                                    <FaCalendarDays className="text-gray-300 fa-2x opacity-25" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                    <div className="card shadow h-100 py-2 border-info border-4 border-end-0 border-top-0 border-bottom-0 border-start">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                                        Merch Items</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.merch}</div>
                                </div>
                                <div className="col-auto">
                                    <FaShirt className="text-gray-300 fa-2x opacity-25" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="col-xl-3 col-md-6 mb-4">
                    <div className="card shadow h-100 py-2 border-warning border-4 border-end-0 border-top-0 border-bottom-0 border-start">
                        <div className="card-body">
                            <div className="row no-gutters align-items-center">
                                <div className="col mr-2">
                                    <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                                        Pending Orders</div>
                                    <div className="h5 mb-0 font-weight-bold text-gray-800">{stats.orders}</div>
                                </div>
                                <div className="col-auto">
                                    <FaClipboardList className="text-gray-300 fa-2x opacity-25" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

             <div className="row">
                <div className="col-12">
                     <div className="card shadow mb-4">
                        <div className="card-header py-3">
                            <h6 className="m-0 font-weight-bold text-primary">Admin Controls</h6>
                        </div>
                        <div className="card-body">
                            <p>Use the sidebar to manage users, events, merchandise, and announcements.</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
