import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';
import { toast } from 'react-toastify';
import logo from '../assets/uc-central-logo.svg';
import { FaLock, FaEye, FaEyeSlash } from 'react-icons/fa6';
import PasswordStrength from '../components/PasswordStrength';

const ResetPassword = () => {
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const token = location.state?.token;

    if (!token) {
        navigate('/forgot-password');
        toast.error("No reset token found. Please start the process again.");
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            toast.error("Passwords do not match.");
            return;
        }
        setLoading(true);
        try {
            await API.request('/auth/reset-password', 'POST', { token, password, confirmPassword });
            toast.success('Password has been reset successfully!');
            navigate('/login');
        } catch (error) {
            console.error("Reset Password Error:", error);
            console.error("Error Response:", error.response);
            toast.error(error.message || 'An error occurred. Please check the console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="auth-container w-100">
                <div className="auth-header text-center mb-4">
                    <img src={logo} alt="UC Logo" style={{ height: '60px' }} className="mb-2" />
                    <h2>Reset Password</h2>
                    <p className="text-muted">Choose a new, strong password</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="password" className="form-label">New Password</label>
                        <div className="input-group">
                            <span className="input-group-text"><FaLock /></span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control"
                                id="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                            />
                            <span className="input-group-text" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                        </div>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="confirmPassword" className="form-label">Confirm New Password</label>
                        <div className="input-group">
                             <span className="input-group-text"><FaLock /></span>
                            <input
                                type={showConfirmPassword ? 'text' : 'password'}
                                className="form-control"
                                id="confirmPassword"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />
                             <span className="input-group-text" onClick={() => setShowConfirmPassword(!showConfirmPassword)} style={{ cursor: 'pointer' }}>
                                {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                        </div>
                    </div>

                    <div className="mt-3">
                        <PasswordStrength password={password} />
                    </div>

                    <div className="d-grid gap-2">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Resetting...' : 'Reset Password'}
                        </button>
                    </div>
                </form>

                 <div className="mt-3 text-center">
                    <p className="small">
                       <Link to="/login" className="text-muted">Back to Login</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
