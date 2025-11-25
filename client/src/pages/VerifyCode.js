import React, { useState } from 'react';
import API from '../utils/api';
import { toast } from 'react-toastify';
import { useNavigate, useLocation } from 'react-router-dom';

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
            const { data } = await API.post('/auth/verify-code', { studentId, code });
            toast.success('Verification successful!');
            navigate('/reset-password', { state: { token: data.resetToken } });
        } catch (error) {
            toast.error(error.response?.data?.message || 'An error occurred.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="container mt-5">
            <div className="row justify-content-center">
                <div className="col-md-6">
                    <div className="card">
                        <div className="card-body">
                            <h3 className="card-title text-center">Enter Verification Code</h3>
                            <p className="text-center text-muted">A 6-digit code was sent to your email.</p>
                            <form onSubmit={handleSubmit}>
                                <div className="form-group">
                                    <label>Verification Code</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        value={code}
                                        onChange={(e) => setCode(e.target.value)}
                                        required
                                        maxLength="6"
                                    />
                                </div>
                                <button type="submit" className="btn btn-primary btn-block mt-3" disabled={loading}>
                                    {loading ? 'Verifying...' : 'Verify Code'}
                                </button>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VerifyCode;
