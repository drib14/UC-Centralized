import React, { useEffect } from 'react';
import { FaTimes, FaDownload, FaImage } from 'react-icons/fa';

const ImageModal = ({ show, onClose, imageUrl }) => {
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && show) {
                onClose();
            }
        };
        if (show) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
        }
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [show, onClose]);

    if (!show || !imageUrl) return null;

    const fileName = (imageUrl.split('/').pop() || 'image').split('?')[0];

    return (
        <div
            className="modal show d-block animate-fade-in"
            tabIndex="-1"
            style={{
                backgroundColor: 'rgba(10, 15, 30, 0.88)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                zIndex: 1060
            }}
            onClick={onClose}
        >
            <div className="d-flex flex-column justify-content-between h-100 w-100 p-3 p-md-4">
                {/* Header Action Bar */}
                <div
                    className="d-flex align-items-center justify-content-between w-100 mb-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="d-flex align-items-center text-white gap-2 bg-dark bg-opacity-50 px-2.5 py-1 rounded-pill border border-secondary border-opacity-25 shadow-sm min-w-0">
                        <FaImage className="text-primary flex-shrink-0" size={13} />
                        <span className="small fw-medium text-truncate" style={{ maxWidth: 'min(180px, 42vw)' }}>
                            {fileName}
                        </span>
                    </div>

                    <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                        <a
                            href={imageUrl}
                            download={fileName}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-dark bg-opacity-50 border border-secondary border-opacity-25 rounded-circle text-white d-flex align-items-center justify-content-center hover-scale shadow-sm p-0"
                            style={{ width: '36px', height: '36px' }}
                            title="Download original image"
                        >
                            <FaDownload size={13} />
                        </a>
                        <button
                            type="button"
                            className="btn btn-sm btn-dark bg-opacity-50 border border-secondary border-opacity-25 rounded-circle text-white d-flex align-items-center justify-content-center hover-scale shadow-sm p-0"
                            style={{ width: '36px', height: '36px' }}
                            onClick={onClose}
                            title="Close (Esc)"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>
                </div>

                {/* Dynamic Image Container */}
                <div className="d-flex align-items-center justify-content-center flex-grow-1 overflow-hidden">
                    <img
                        src={imageUrl}
                        alt="Media Preview"
                        className="rounded-3 shadow-lg transition-all"
                        style={{
                            maxWidth: '92vw',
                            maxHeight: '84vh',
                            width: 'auto',
                            height: 'auto',
                            objectFit: 'contain',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.75)'
                        }}
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            </div>
        </div>
    );
};

export default ImageModal;
