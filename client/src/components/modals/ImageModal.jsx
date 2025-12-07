import React from 'react';
import { FaTimes } from 'react-icons/fa';

const ImageModal = ({ show, onClose, imageUrl }) => {
    if (!show || !imageUrl) return null;

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.85)', zIndex: 1055 }}>
            <div className="modal-dialog modal-fullscreen">
                <div className="modal-content bg-transparent border-0 h-100">
                    <div className="modal-header border-0 position-absolute top-0 end-0 z-3">
                        <button type="button" className="btn btn-link text-white fs-2" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>
                    <div className="modal-body d-flex align-items-center justify-content-center p-0" onClick={onClose}>
                        <img
                            src={imageUrl}
                            alt="Full View"
                            className="img-fluid"
                            style={{ maxHeight: '90vh', maxWidth: '90vw', objectFit: 'contain' }}
                            onClick={(e) => e.stopPropagation()}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ImageModal;
