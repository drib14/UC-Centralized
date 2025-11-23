import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-toastify';
import logo from '../assets/uc-central-logo.png';

const Register = () => {
    const { register } = useAuth();
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        studentId: '',
        email: '',
        firstName: '',
        lastName: '',
        department: 'CCS',
        program: '',
        year: '1',
        password: '',
        confirmPassword: ''
    });

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.id]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.password !== formData.confirmPassword) {
            toast.error("Passwords do not match!");
            return;
        }

        try {
            const { confirmPassword, ...data } = formData;
            await register({ ...data, role: 'student' });
            toast.success("Registration successful! Please login.");
            setTimeout(() => navigate('/login'), 1500);
        } catch (error) {
            toast.error(error.message || "Registration failed");
        }
    };

    return (
        <div className="container py-5">
            <div className="auth-container w-100 mx-auto" style={{ maxWidth: '600px' }}>
                <div className="auth-header text-center mb-4">
                    <img src={logo} alt="UC Logo" style={{ height: '60px' }} className="mb-2" />
                    <h2>Create Account</h2>
                    <p className="text-muted">Join the UC-Central community</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label htmlFor="firstName" className="form-label">First Name</label>
                            <input type="text" className="form-control" id="firstName" required value={formData.firstName} onChange={handleChange} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label htmlFor="lastName" className="form-label">Last Name</label>
                            <input type="text" className="form-control" id="lastName" required value={formData.lastName} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="mb-3">
                        <label htmlFor="email" className="form-label">Email Address</label>
                        <input type="email" className="form-control" id="email" required value={formData.email} onChange={handleChange} />
                    </div>

                    <div className="mb-3">
                        <label htmlFor="studentId" className="form-label">Student ID</label>
                        <input type="text" className="form-control" id="studentId" required value={formData.studentId} onChange={handleChange} />
                    </div>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label htmlFor="department" className="form-label">Department</label>
                            <select className="form-select" id="department" required value={formData.department} onChange={handleChange}>
                                <option value="CCS">College of Computer Studies (CCS)</option>
                                <option value="CBA">College of Business Administration (CBA)</option>
                                <option value="CAS">College of Arts and Sciences (CAS)</option>
                            </select>
                        </div>
                        <div className="col-md-6 mb-3">
                            <label htmlFor="year" className="form-label">Year Level</label>
                            <select className="form-select" id="year" required value={formData.year} onChange={handleChange}>
                                <option value="1">1st Year</option>
                                <option value="2">2nd Year</option>
                                <option value="3">3rd Year</option>
                                <option value="4">4th Year</option>
                            </select>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label htmlFor="program" className="form-label">Program</label>
                        <input type="text" className="form-control" id="program" placeholder="e.g. BSIT" required value={formData.program} onChange={handleChange} />
                    </div>

                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label htmlFor="password" className="form-label">Password</label>
                            <input type="password" className="form-control" id="password" required value={formData.password} onChange={handleChange} />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
                            <input type="password" className="form-control" id="confirmPassword" required value={formData.confirmPassword} onChange={handleChange} />
                        </div>
                    </div>

                    <div className="d-grid gap-2 mt-4">
                        <button type="submit" className="btn btn-primary">Register</button>
                    </div>
                </form>

                <div className="mt-3 text-center">
                    <p className="small">
                        Already have an account? <Link to="/login" className="text-success">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
