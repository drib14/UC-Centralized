import React, { useState, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import API from '../utils/api';
import { toast } from 'react-toastify';
import logo from '../assets/uc-central-logo.svg';

const VerifyCode = () => {
    const [code, setCode] = useState(new Array(6).fill(''));
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();
    const location = useLocation();
    const studentId = location.state?.studentId;
    const inputsRef = useRef([]);

    if (!studentId) {
        navigate('/forgot-password');
        toast.error("No student ID found. Please start the process again.");
        return null;
    }

    const handleChange = (e, index) => {
        const { value } = e.target;
        if (!/^[0-9]$/.test(value) && value !== '') return;

        const newCode = [...code];
        newCode[index] = value;
        setCode(newCode);

        if (value && index < 5) {
            inputsRef.current[index + 1].focus();
        }
    };

    const handleKeyDown = (e, index) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputsRef.current[index - 1].focus();
        }
    };

    const handlePaste = (e) => {
        const paste = e.clipboardData.getData('text');
        if (/^[0-9]{6}$/.test(paste)) {
            const newCode = paste.split('');
            setCode(newCode);
            inputsRef.current[5].focus();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        const verificationCode = code.join('');

        if (verificationCode.length !== 6) {
            toast.error("Please enter the complete 6-digit code.");
            setLoading(false);
            return;
        }

        try {
            const data = await API.request('/auth/verify-code', 'POST', { studentId, code: verificationCode });
            toast.success('Verification successful!');
            navigate('/reset-password', { state: { token: data.resetToken } });
        } catch (error) {
            toast.error(error.message || 'Invalid or expired code.');
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
                    <div className="d-flex justify-content-center gap-2 mb-4" onPaste={handlePaste}>
                        {code.map((digit, index) => (
                            <input
                                key={index}
                                ref={el => inputsRef.current[index] = el}
                                type="text"
                                className="form-control text-center"
                                style={{ width: '45px', height: '45px', fontSize: '1.2rem' }}
                                maxLength="1"
                                value={digit}
                                onChange={e => handleChange(e, index)}
                                onKeyDown={e => handleKeyDown(e, index)}
                                onFocus={e => e.target.select()}
                                required
                            />
                        ))}
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
