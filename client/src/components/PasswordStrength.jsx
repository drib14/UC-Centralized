import React from 'react';
import { FaCheckCircle, FaTimesCircle } from 'react-icons/fa';

const PasswordStrength = ({ password }) => {
    const requirements = [
        { regex: /.{8,}/, text: 'At least 8 characters' },
        { regex: /[a-z]/, text: 'A lowercase letter' },
        { regex: /[A-Z]/, text: 'An uppercase letter' },
        { regex: /\d/, text: 'A number' },
        { regex: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/, text: 'A special character' }
    ];

    const passedRequirements = requirements.filter(req => req.regex.test(password));
    const strength = Math.min(100, (passedRequirements.length / requirements.length) * 100);

    const getProgressBarColor = () => {
        if (strength < 50) return 'bg-danger';
        if (strength < 80) return 'bg-warning';
        return 'bg-success';
    };

    return (
        <div>
            <div className="progress mb-2" style={{ height: '5px' }}>
                <div
                    className={`progress-bar ${getProgressBarColor()}`}
                    role="progressbar"
                    style={{ width: `${strength}%` }}
                    aria-valuenow={strength}
                    aria-valuemin="0"
                    aria-valuemax="100"
                ></div>
            </div>
            <ul className="list-unstyled small">
                {requirements.map((req, index) => (
                    <li key={index} className={`d-flex align-items-center ${req.regex.test(password) ? 'text-success' : 'text-danger'}`}>
                        {req.regex.test(password) ? <FaCheckCircle className="me-2" /> : <FaTimesCircle className="me-2" />}
                        <small>{req.text}</small>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PasswordStrength;
