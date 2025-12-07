import React from 'react';

const DeleteMessageModal = ({ show, onClose, onDeleteForMe, onDeleteForEveryone, isOwnMessage }) => {
    if (!show) return null;

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered modal-sm">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title h6">Delete Message?</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body d-flex flex-column gap-2">
                        {isOwnMessage && (
                            <button className="btn btn-outline-danger w-100" onClick={onDeleteForEveryone}>
                                Delete for Everyone
                            </button>
                        )}
                        <button className="btn btn-outline-secondary w-100" onClick={onDeleteForMe}>
                            Delete for Me
                        </button>
                        <button className="btn btn-light w-100" onClick={onClose}>
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteMessageModal;
