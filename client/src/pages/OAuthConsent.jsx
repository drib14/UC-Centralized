import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import API from '../utils/api';
import { useAuth } from '../context/AuthContext';
import UniversalSkeleton from '../components/skeletons/UniversalSkeleton';
import { toast } from 'react-toastify';
import logo from '../assets/uc-central-logo.png';
import SEO from '../components/SEO';

const OAuthConsent = () => {
    const [searchParams] = useSearchParams();
    const { user, loading: authLoading } = useAuth();
    const [appInfo, setAppInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const client_id = searchParams.get('client_id');
        const redirect_uri = searchParams.get('redirect_uri');

        if (!client_id || !redirect_uri) {
            setError('Invalid OAuth Request: Missing parameters');
            setLoading(false);
            return;
        }

        API.request(`/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}`)
            .then(data => {
                setAppInfo(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("OAuth Error:", err);
                setError(err.message || "Invalid Application. Please check your Client ID and Redirect URI.");
                setLoading(false);
            });
    }, [searchParams]);

    const handleApprove = async () => {
        try {
            const res = await API.request('/oauth/approve', 'POST', {
                client_id: appInfo.client_id,
                redirect_uri: appInfo.redirect_uri
            });
            window.location.href = res.redirect_to;
        } catch (e) {
            toast.error("Failed to approve");
        }
    };

    const handleCancel = () => {
        if (appInfo && appInfo.redirect_uri) {
            const separator = appInfo.redirect_uri.includes('?') ? '&' : '?';
            window.location.href = `${appInfo.redirect_uri}${separator}error=access_denied`;
        }
    };

    if (authLoading) return <div className="text-center mt-5">Loading Auth...</div>;

    // If not logged in, we should ideally redirect to login with a "returnTo" state.
    // For this simple implementation, if user isn't logged in, they can't see this page (if protected)
    // OR we show a "Please login" message.
    if (!user) {
        return (
            <div className="container mt-5 text-center">
                <h3>Please Login</h3>
                <p>You need to be logged in to authorize applications.</p>
                <a href={`/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`} className="btn btn-primary">Go to Login</a>
            </div>
        );
    }

    if (loading) return <UniversalSkeleton />;

    if (error) {
        return (
            <div className="container mt-5 text-center">
                <SEO title="Authorization Error" />
                <div className="alert alert-danger">{error}</div>
            </div>
        );
    }

    return (
        <div className="container d-flex align-items-center justify-content-center" style={{ minHeight: '100vh' }}>
            <div className="card shadow-lg" style={{ maxWidth: '500px', width: '100%' }}>
                <div className="card-body text-center p-5">
                    <img src={logo} alt="UC Logo" style={{ height: '60px' }} className="mb-3" />
                    <h4 className="mb-3">Authorize Application</h4>
                    <p className="lead">
                        <strong>{appInfo.app.name}</strong> wants to access your UC-Central account.
                    </p>
                    <div className="alert alert-light border">
                        <small className="text-muted d-block text-start mb-2">This app will be able to:</small>
                        <ul className="text-start small mb-0">
                            <li>Read your profile information (Name, Email, Student ID)</li>
                            <li>Verify your identity</li>
                        </ul>
                    </div>
                    <div className="d-grid gap-2 mt-4">
                        <button className="btn btn-success btn-lg" onClick={handleApprove}>Authorize Access</button>
                        <button className="btn btn-outline-secondary" onClick={handleCancel}>Cancel</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OAuthConsent;
