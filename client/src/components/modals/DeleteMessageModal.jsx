import React from 'react';
import { FaTrash, FaTimes } from 'react-icons/fa';

const DeleteMessageModal = ({ show, onClose, onDeleteForMe, onDeleteForEveryone, isOwnMessage }) => {
    if (!show) return null;

    return (
        <div
            className="modal show d-block animate-fade-in"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)', zIndex: 1080 }}
            onClick={onClose}
        >
            <div
                className="modal-dialog modal-dialog-centered modal-sm mx-3 mx-sm-auto"
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="modal-header border-bottom py-3 px-3.5 bg-white d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                            <FaTrash className="text-danger" size={14} />
                            <h6 className="modal-title fw-bold text-dark mb-0 font-outfit">Delete Message?</h6>
                        </div>
                        <button type="button" className="btn-close" onClick={onClose} />
                    </div>
                    <div className="modal-body p-3.5 d-flex flex-column gap-2 bg-white">
                        <p className="small text-muted mb-2">Choose who you want to remove this message for:</p>
                        {isOwnMessage && (
                            <button
                                type="button"
                                className="btn btn-danger rounded-pill py-2 fw-semibold shadow-xs"
                                onClick={onDeleteForEveryone}
                            >
                                Delete for Everyone
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-outline-danger rounded-pill py-2 fw-semibold"
                            onClick={onDeleteForMe}
                        >
                            Delete for Me Only
                        </button>
                        <button
                            type="button"
                            className="btn btn-light rounded-pill py-2 text-secondary fw-semibold mt-1"
                            onClick={onClose}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DeleteMessageModal;
