import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';

import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import StudentDashboard from './pages/student/StudentDashboard';
import StudentEvents from './pages/student/StudentEvents';
import StudentMerch from './pages/student/StudentMerch';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import Placeholder from './components/Placeholder';

const ProtectedRoute = ({ children, allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) return null;

    if (!user) {
        return <Navigate to="/login" replace />;
    }

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/student/dashboard'} replace />;
    }

    return children;
};

function App() {
    return (
        <AuthProvider>
            <CartProvider>
                <Router>
                    <ToastContainer position="top-right" autoClose={5000} />
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />

                        {/* Student Routes */}
                        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><Layout /></ProtectedRoute>}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<StudentDashboard />} />
                            <Route path="events" element={<StudentEvents />} />
                            <Route path="merch" element={<StudentMerch />} />
                            <Route path="cart" element={<Placeholder title="Cart" />} />
                            <Route path="messages" element={<Placeholder title="Messages" />} />
                            <Route path="profile" element={<Placeholder title="Profile" />} />
                        </Route>

                        {/* Admin Routes */}
                        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="users" element={<Placeholder title="User Management" />} />
                            <Route path="events" element={<AdminEvents />} />
                            <Route path="merch" element={<Placeholder title="Merch Management" />} />
                            <Route path="announcements" element={<Placeholder title="Announcements" />} />
                            <Route path="orders" element={<Placeholder title="Orders" />} />
                            <Route path="pos" element={<Placeholder title="POS" />} />
                            <Route path="messages" element={<Placeholder title="Messages" />} />
                        </Route>

                         {/* Catch all */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
            </CartProvider>
        </AuthProvider>
    );
}

export default App;
