import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import { SocketProvider } from './context/SocketContext';

import Layout from './components/Layout';
import SplashScreen from './components/SplashScreen';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import VerifyCode from './pages/VerifyCode';
import ResetPassword from './pages/ResetPassword';
import Documentation from './pages/Documentation';
import OAuthConsent from './pages/OAuthConsent';

import StudentDashboard from './pages/student/StudentDashboard';
import StudentEvents from './pages/student/StudentEvents';
import StudentMerch from './pages/student/StudentMerch';
import StudentCart from './pages/student/StudentCart';
import StudentMessages from './pages/student/StudentMessages';
import StudentProfile from './pages/student/StudentProfile';
import DeveloperDashboard from './pages/student/DeveloperDashboard';

import AdminDashboard from './pages/admin/AdminDashboard';
import AdminEvents from './pages/admin/AdminEvents';
import AdminMerch from './pages/admin/AdminMerch';
import AdminAnnouncements from './pages/admin/AdminAnnouncements';
import AdminUsers from './pages/admin/AdminUsers';
import AdminOrders from './pages/admin/AdminOrders';
import AdminPOS from './pages/admin/AdminPOS';
import AdminMessages from './pages/admin/AdminMessages';
import Notifications from './pages/Notifications';

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
    const [showSplash, setShowSplash] = useState(true);

    useEffect(() => {
        const timer = setTimeout(() => {
            setShowSplash(false);
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

    if (showSplash) {
        return <SplashScreen />;
    }

    return (
        <AuthProvider>
            <SocketProvider>
                <CartProvider>
                    <Router>
                        <ToastContainer position="top-right" autoClose={5000} />
                    <Routes>
                        {/* Public Routes */}
                        <Route path="/" element={<Landing />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/verify-code" element={<VerifyCode />} />
                        <Route path="/reset-password" element={<ResetPassword />} />
                        <Route path="/documentation" element={<Documentation />} />
                        <Route path="/oauth/authorize" element={<OAuthConsent />} />

                        {/* Student Routes */}
                        <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><Layout /></ProtectedRoute>}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<StudentDashboard />} />
                            <Route path="events" element={<StudentEvents />} />
                            <Route path="merch" element={<StudentMerch />} />
                            <Route path="cart" element={<StudentCart />} />
                            <Route path="messages" element={<StudentMessages />} />
                            <Route path="notifications" element={<Notifications />} />
                            <Route path="profile" element={<StudentProfile />} />
                            <Route path="developer" element={<DeveloperDashboard />} />
                        </Route>

                        {/* Admin Routes */}
                        <Route path="/admin" element={<ProtectedRoute allowedRoles={['admin']}><Layout /></ProtectedRoute>}>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<AdminDashboard />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="events" element={<AdminEvents />} />
                            <Route path="merch" element={<AdminMerch />} />
                            <Route path="announcements" element={<AdminAnnouncements />} />
                            <Route path="orders" element={<AdminOrders />} />
                            <Route path="pos" element={<AdminPOS />} />
                            <Route path="messages" element={<AdminMessages />} />
                            <Route path="notifications" element={<Notifications />} />
                        </Route>

                         {/* Catch all */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
                </Router>
                </CartProvider>
            </SocketProvider>
        </AuthProvider>
    );
}

export default App;
