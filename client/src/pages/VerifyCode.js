import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';
import { toast } from 'react-toastify';
import logo from '../assets/uc-central-logo.png';
import { FaShieldHalved } from 'react-icons/fa6';

const VerifyCode = () => {
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const studentId = location.state?.studentId;

    if (!studentId) {
        navigate('/forgot-password');
        toast.error("No student ID found. Please start the process again.");
        return null;
    }

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const data = await API.request('/auth/verify-code', 'POST', { studentId, code });
            toast.success('Verification successful!');
            navigate('/reset-password', { state: { token: data.resetToken } });
        } catch (error) {
            console.error("Verify Code Error:", error);
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
                    <h2>Enter Verification Code</h2>
                    <p className="text-muted">A 6-digit code was sent to your email.</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="mb-3">
                        <label htmlFor="code" className="form-label">Verification Code</label>
                        <div className="input-group">
                            <span className="input-group-text"><FaShieldHalved /></span>
                            <input
                                type="text"
                                className="form-control"
                                id="code"
                                placeholder="_ _ _ _ _ _"
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                required
                                maxLength="6"
                            />
                        </div>
                    </div>
                    <div className="d-grid gap-2">
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? 'Verifying...' : 'Verify Code'}
                        </button>
                    </div>
                </form>

                <div className="mt-3 text-center">
                    <p className="small">
                        Didn't receive a code? <Link to="/forgot-password">Request a new one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default VerifyCode;
