import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import API from '../utils/api';
import { toast } from 'react-toastify';
import logo from '../assets/uc-central-logo.svg';
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
            await API.request('/auth/forgot-password', 'POST', { studentId, email });
            toast.success('A verification code has been sent to your email.');
            navigate('/verify-code', { state: { studentId } });
        } catch (error) {
            if (error.response && error.response.status === 404) {
                toast.error("ID number doesn't exist.");
            } else if (error.response && error.response.status === 400) {
                toast.error("Email doesn't exist for the provided ID number.");
            } else {
                toast.error(error.message || 'An error occurred. Please try again.');
            }
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
                        <label htmlFor="studentId" className="form-label">ID Number</label>
                        <div className="input-group">
                             <span className="input-group-text"><FaIdCard /></span>
                            <input
                                type="text"
                                className="form-control"
                                id="studentId"
                                placeholder="ID Number"
                                value={studentId}
                                onChange={(e) => setStudentId(e.target.value)}
                                required
                            />
                        </div>
                    </div>
                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Registered Email</label>
                        <div className="input-group">
                             <span className="input-group-text"><FaEnvelope /></span>
                            <input
                                type="email"
                                className="form-control"
                                id="email"
                                placeholder="Email address"
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
