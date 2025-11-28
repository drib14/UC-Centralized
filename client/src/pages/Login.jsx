import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import logo from '../assets/uc-central-logo.png';
import { FaIdCard, FaLock, FaEye, FaEyeSlash } from 'react-icons/fa6';
import SEO from '../components/SEO';

const Login = () => {
    const [studentId, setStudentId] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const user = await login(studentId, password);
            toast.success("Login successful! Redirecting...");
            setTimeout(() => {
                if (user.role === 'admin') {
                    navigate('/admin/dashboard');
                } else {
                    navigate('/student/dashboard');
                }
            }, 1000);
        } catch (error) {
            toast.error(error.message || "Login failed");
        }
    };

    return (
        <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <SEO title="Login" description="Sign in to your UC-Central account." />
            <div className="auth-container w-100">
                <div className="auth-header text-center mb-4">
                    <img src={logo} alt="UC Logo" style={{ height: '60px' }} className="mb-2" />
                    <h2>UC-Central</h2>
                    <p className="text-muted">Sign in to your account</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="studentId" className="form-label">Student ID</label>
                        <div className="input-group">
                            <span className="input-group-text"><FaIdCard /></span>
                            <input
                                type="number"
                                className="form-control"
                                id="studentId"
                                placeholder="e.g., 12345678 (Numbers Only)"
                                required
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                            />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="password" className="form-label">Password</label>
                        <div className="input-group">
                            <span className="input-group-text"><FaLock /></span>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                className="form-control"
                                id="password"
                                placeholder="********"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <span className="input-group-text" onClick={() => setShowPassword(!showPassword)} style={{ cursor: 'pointer' }}>
                                {showPassword ? <FaEyeSlash /> : <FaEye />}
                            </span>
                        </div>
                    </div>
                     <div className="d-flex justify-content-end mb-3">
                        <Link to="/forgot-password" style={{ fontSize: '0.9rem' }}>Forgot Password?</Link>
                    </div>
                    <div className="d-grid gap-2">
                        <button type="submit" className="btn btn-primary">Login</button>
                    </div>
                </form>

                <div className="mt-3 text-center">
                    <p className="small">
                        Don't have an account? <Link to="/register" className="text-success">Register here</Link>
                    </p>
                    <p className="small">
                        <Link to="/" className="text-muted">Back to Home</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
