import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { toast } from 'react-toastify';
import logo from '../assets/uc-central-logo.png';
import { FaIdCard, FaEnvelope } from 'react-icons/fa6';

const ForgotPassword = () => {
    const [studentId, setStudentId] = useState('');
    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await API.post('/auth/forgot-password', { studentId, email });
            toast.success('A verification code has been sent to your email.');
            navigate('/verify-code', { state: { studentId } });
        } catch (error) {
            console.error("Forgot Password Error:", error);
            console.error("Error Response:", error.response);
            toast.error(error.response?.data?.message || 'An error occurred. Please check the console for details.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="auth-container w-100">
                <div className="auth-header text-center mb-4">
                    <img src={logo} alt="UC Logo" style={{ height: '60px' }} className="mb-2" />
                    <h2>Forgot Password</h2>
                    <p className="text-muted">Enter your details to receive a verification code</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="studentId" className="form-label">Student ID</label>
                        <div className="input-group">
                             <span className="input-group-text"><FaIdCard /></span>
                            <input
                                type="text"
                                className="form-control"
                                id="studentId"
                                placeholder="e.g., 12345678"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email address</label>
                        <div className="input-group">
                             <span className="input-group-text"><FaEnvelope /></span>
                            <input
                                type="email"
                                className="form-control"
                                id="email"
                                placeholder="Your registered email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="d-grid gap-2">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Sending...' : 'Send Verification Code'}
                        </button>
                    </div>
                </form>
                <div className="mt-3 text-center">
                    <p className="small">
                        Remember your password? <Link to="/login" className="text-success">Login here</Link>
                    </p>
                    <p className="small">
                        <Link to="/" className="text-muted">Back to Home</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
