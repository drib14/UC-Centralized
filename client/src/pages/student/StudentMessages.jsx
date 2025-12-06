import React from 'react';

const StudentMessages = () => {
    return (
        <div className="container-fluid p-0 d-flex flex-column align-items-center justify-content-center" style={{ height: '80vh' }}>
            <div className="text-center">
                <h1 className="display-4 text-muted mb-3">Messages</h1>
                <p className="lead text-muted">Messaging system is currently under maintenance.</p>
                <div className="mt-4">
                    <span className="spinner-border text-primary" role="status"></span>
                </div>
            </div>
        </div>
    );
};

export default StudentMessages;
