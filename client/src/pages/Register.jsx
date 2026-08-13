import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import API from '../utils/api';
import { toast } from 'react-toastify';
import logo from '../assets/uc-central-logo.svg';
import { FaEye, FaEyeSlash, FaUser, FaGraduationCap, FaShieldHalved, FaArrowRight, FaArrowLeft, FaCheck } from 'react-icons/fa6';
import PasswordStrength from '../components/PasswordStrength';
import SEO from '../components/SEO';

const Register = () => {
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [departments, setDepartments] = useState([]);
    const [loadingDepts, setLoadingDepts] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        studentId: '',
        email: '',
        firstName: '',
        lastName: '',
        department: '',
        program: '',
        year: '1',
        password: '',
        confirmPassword: ''
    });

    // Fetch dynamic departments from DB created by Admin
    useEffect(() => {
        const fetchDepartments = async () => {
            try {
                const data = await API.getDepartments();
                if (Array.isArray(data) && data.length > 0) {
                    setDepartments(data);
                    setFormData(prev => ({
                        ...prev,
                        department: prev.department || data[0].code
                    }));
                } else {
                    setDepartments([]);
                }
            } catch (err) {
                console.error("Failed to load departments from DB:", err);
                setDepartments([]);
            } finally {
                setLoadingDepts(false);
            }
        };

        fetchDepartments();
    }, []);

    const handleChange = (e) => {
        const { id, value } = e.target;
        if (id === 'studentId') {
            // Strictly digits only (remove any letters, spaces, or special characters)
            const numericOnly = value.replace(/\D/g, '');
            setFormData({ ...formData, studentId: numericOnly });
            return;
        }
        setFormData({ ...formData, [id]: value });
    };

    const handleNumericKeyDown = (e) => {
        // Block any non-digit keys except standard navigation/editing keys
        const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'];
        if (!/^\d$/.test(e.key) && !allowedKeys.includes(e.key) && !e.ctrlKey && !e.metaKey) {
            e.preventDefault();
        }
    };

    // Step 1 Validation
    const validateStep1 = () => {
        if (!formData.firstName.trim()) {
            toast.error("Please enter your First Name.");
            return false;
        }
        if (!formData.lastName.trim()) {
            toast.error("Please enter your Last Name.");
            return false;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!formData.email.trim() || !emailRegex.test(formData.email.trim())) {
            toast.error("Please enter a valid Email Address.");
            return false;
        }
        if (!formData.studentId.trim() || !/^\d+$/.test(formData.studentId.trim())) {
            toast.error("Please enter a valid numeric Student ID.");
            return false;
        }
        return true;
    };

    // Step 2 Validation
    const validateStep2 = () => {
        if (!formData.department) {
            toast.error("Please select a Department.");
            return false;
        }
        if (!formData.program.trim()) {
            toast.error("Please enter your Academic Program.");
            return false;
        }
        if (!formData.year) {
            toast.error("Please select your Year Level.");
            return false;
        }
        return true;
    };

    const handleNext = () => {
        if (step === 1 && validateStep1()) {
            setStep(2);
        } else if (step === 2 && validateStep2()) {
            setStep(3);
        }
    };

    const handlePrev = () => {
        if (step > 1) {
            setStep(step - 1);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep1() || !validateStep2()) {
            return;
        }

        if (!formData.password) {
            toast.error("Please enter a password.");
            return;
        }

        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }

        const passRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]).{8,}$/;
        if (!passRegex.test(formData.password)) {
            toast.error("Password must be at least 8 characters long with uppercase, lowercase, number, and special character.");
            return;
        }

        setIsSubmitting(true);
        try {
            const { confirmPassword, ...data } = formData;
            await register({ ...data, role: 'student' });
            toast.success("Registration successful! Please login.");
            setTimeout(() => navigate('/login'), 1500);
        } catch (error) {
            toast.error(error.message || "Registration failed");
            setIsSubmitting(false);
        }
    };

    return (
        <div className="container py-5">
            <SEO title="Register" description="Create your UC-Central account today." />
            <div className="auth-container w-100 mx-auto" style={{ maxWidth: '650px' }}>
                <div className="auth-header text-center mb-4">
                    <img src={logo} alt="UC Logo" style={{ height: '60px' }} className="mb-2" />
                    <h2>Create Account</h2>
                    <p className="text-muted">Join the UC-Central community</p>
                </div>

                {/* Sequential Step Progress Tracker */}
                <div className="mb-4">
                    <div className="d-flex justify-content-between position-relative mb-2">
                        {/* Connecting Progress Line */}
                        <div
                            className="position-absolute top-50 start-0 translate-middle-y bg-light"
                            style={{ height: '4px', width: '100%', zIndex: 0 }}
                        >
                            <div
                                className="bg-primary transition-all"
                                style={{
                                    height: '100%',
                                    width: step === 1 ? '0%' : step === 2 ? '50%' : '100%',
                                    transition: 'width 0.4s ease'
                                }}
                            ></div>
                        </div>

                        {/* Step 1 Indicator */}
                        <div
                            className={`d-flex flex-column align-items-center position-relative ${step >= 1 ? 'text-primary' : 'text-muted'}`}
                            style={{ zIndex: 1, cursor: 'pointer' }}
                            onClick={() => { if (step > 1) setStep(1); }}
                        >
                            <div
                                className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm fw-bold ${step > 1 ? 'bg-success text-white' : step === 1 ? 'bg-primary text-white ring' : 'bg-white border text-muted'}`}
                                style={{ width: '38px', height: '38px', transition: 'all 0.3s' }}
                            >
                                {step > 1 ? <FaCheck size={16} /> : <FaUser size={16} />}
                            </div>
                            <span className="small fw-bold mt-1">1. Personal</span>
                        </div>

                        {/* Step 2 Indicator */}
                        <div
                            className={`d-flex flex-column align-items-center position-relative ${step >= 2 ? 'text-primary' : 'text-muted'}`}
                            style={{ zIndex: 1, cursor: step > 2 ? 'pointer' : 'default' }}
                            onClick={() => { if (step > 2) setStep(2); }}
                        >
                            <div
                                className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm fw-bold ${step > 2 ? 'bg-success text-white' : step === 2 ? 'bg-primary text-white ring' : 'bg-white border text-muted'}`}
                                style={{ width: '38px', height: '38px', transition: 'all 0.3s' }}
                            >
                                {step > 2 ? <FaCheck size={16} /> : <FaGraduationCap size={16} />}
                            </div>
                            <span className="small fw-bold mt-1">2. Academic</span>
                        </div>

                        {/* Step 3 Indicator */}
                        <div
                            className={`d-flex flex-column align-items-center position-relative ${step >= 3 ? 'text-primary' : 'text-muted'}`}
                            style={{ zIndex: 1 }}
                        >
                            <div
                                className={`rounded-circle d-flex align-items-center justify-content-center shadow-sm fw-bold ${step === 3 ? 'bg-primary text-white ring' : 'bg-white border text-muted'}`}
                                style={{ width: '38px', height: '38px', transition: 'all 0.3s' }}
                            >
                                <FaShieldHalved size={16} />
                            </div>
                            <span className="small fw-bold mt-1">3. Security</span>
                        </div>
                    </div>
                    <div className="text-center text-muted small mt-1">
                        Step {step} of 3
                    </div>
                </div>

                <form onSubmit={handleSubmit}>
                    {/* STEP 1: PERSONAL INFORMATION */}
                    {step === 1 && (
                        <div className="animate__animated animate__fadeIn">
                            <h5 className="border-bottom pb-2 mb-3 text-primary d-flex align-items-center">
                                <FaUser className="me-2" /> Personal Information
                            </h5>

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="firstName" className="form-label fw-semibold">First Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="firstName"
                                        placeholder="First name"
                                        required
                                        value={formData.firstName}
                                        onChange={handleChange}
                                        autoFocus
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="lastName" className="form-label fw-semibold">Last Name</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="lastName"
                                        placeholder="Last name"
                                        required
                                        value={formData.lastName}
                                        onChange={handleChange}
                                    />
                                </div>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="email" className="form-label fw-semibold">Email Address</label>
                                <input
                                    type="email"
                                    className="form-control"
                                    id="email"
                                    placeholder="Email address"
                                    required
                                    value={formData.email}
                                    onChange={handleChange}
                                />
                            </div>

                            <div className="mb-4">
                                <label htmlFor="studentId" className="form-label fw-semibold">Student ID (Numbers Only)</label>
                                <input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="form-control"
                                    id="studentId"
                                    placeholder="ID Number"
                                    required
                                    value={formData.studentId}
                                    onChange={handleChange}
                                    onKeyDown={handleNumericKeyDown}
                                />
                                <div className="form-text text-muted">
                                    Your official UC student identification number.
                                </div>
                            </div>

                            <div className="d-grid gap-2 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-primary d-flex align-items-center justify-content-center py-2 fw-semibold"
                                    onClick={handleNext}
                                >
                                    Continue to Academic Details <FaArrowRight className="ms-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: ACADEMIC DETAILS */}
                    {step === 2 && (
                        <div className="animate__animated animate__fadeIn">
                            <h5 className="border-bottom pb-2 mb-3 text-primary d-flex align-items-center">
                                <FaGraduationCap className="me-2" /> Academic Details
                            </h5>

                            <div className="mb-3">
                                <label htmlFor="department" className="form-label fw-semibold">Department (From Campus DB)</label>
                                {loadingDepts ? (
                                    <div className="d-flex align-items-center p-2 text-muted">
                                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                        Loading departments...
                                    </div>
                                ) : (
                                    <select
                                        className="form-select"
                                        id="department"
                                        required
                                        value={formData.department}
                                        onChange={handleChange}
                                        autoFocus
                                    >
                                        {departments.map((dept) => (
                                            <option key={dept._id || dept.code} value={dept.code}>
                                                {dept.code} - {dept.name}
                                            </option>
                                        ))}
                                    </select>
                                )}
                                <div className="form-text text-muted">
                                    Select your enrolled college/department at UC Main campus.
                                </div>
                            </div>

                            <div className="row">
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="program" className="form-label fw-semibold">Academic Program</label>
                                    <input
                                        type="text"
                                        className="form-control"
                                        id="program"
                                        placeholder="Program (e.g. BSIT)"
                                        required
                                        value={formData.program}
                                        onChange={handleChange}
                                    />
                                </div>
                                <div className="col-md-6 mb-3">
                                    <label htmlFor="year" className="form-label fw-semibold">Year Level</label>
                                    <select
                                        className="form-select"
                                        id="year"
                                        required
                                        value={formData.year}
                                        onChange={handleChange}
                                    >
                                        <option value="1">1st Year</option>
                                        <option value="2">2nd Year</option>
                                        <option value="3">3rd Year</option>
                                        <option value="4">4th Year</option>
                                    </select>
                                </div>
                            </div>

                            <div className="d-flex justify-content-between gap-3 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center px-4 py-2"
                                    onClick={handlePrev}
                                >
                                    <FaArrowLeft className="me-2" /> Back
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary d-flex align-items-center justify-content-center flex-grow-1 py-2 fw-semibold"
                                    onClick={handleNext}
                                >
                                    Continue to Security <FaArrowRight className="ms-2" />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SECURITY & CREDENTIALS */}
                    {step === 3 && (
                        <div className="animate__animated animate__fadeIn">
                            <h5 className="border-bottom pb-2 mb-3 text-primary d-flex align-items-center">
                                <FaShieldHalved className="me-2" /> Account Security
                            </h5>

                            <div className="mb-3">
                                <label htmlFor="password" className="form-label fw-semibold">Password</label>
                                <div className="input-group">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        className="form-control"
                                        id="password"
                                        placeholder="Password"
                                        required
                                        value={formData.password}
                                        onChange={handleChange}
                                        autoFocus
                                    />
                                    <button
                                        type="button"
                                        className="input-group-text bg-light"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {showPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-3">
                                <label htmlFor="confirmPassword" className="form-label fw-semibold">Confirm Password</label>
                                <div className="input-group">
                                    <input
                                        type={showConfirmPassword ? 'text' : 'password'}
                                        className="form-control"
                                        id="confirmPassword"
                                        placeholder="Confirm password"
                                        required
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                    />
                                    <button
                                        type="button"
                                        className="input-group-text bg-light"
                                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {showConfirmPassword ? <FaEyeSlash /> : <FaEye />}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-3 mb-4">
                                <PasswordStrength password={formData.password} />
                            </div>

                            <div className="d-flex justify-content-between gap-3 mt-4">
                                <button
                                    type="button"
                                    className="btn btn-outline-secondary d-flex align-items-center justify-content-center px-4 py-2"
                                    onClick={handlePrev}
                                    disabled={isSubmitting}
                                >
                                    <FaArrowLeft className="me-2" /> Back
                                </button>
                                <button
                                    type="submit"
                                    className="btn btn-success d-flex align-items-center justify-content-center flex-grow-1 py-2 fw-semibold"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <>
                                            <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                                            Creating Account...
                                        </>
                                    ) : (
                                        <>
                                            <FaCheck className="me-2" /> Complete Registration
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    )}
                </form>

                <div className="mt-4 pt-3 border-top text-center">
                    <p className="small mb-0">
                        Already have an account? <Link to="/login" className="text-primary fw-semibold">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
