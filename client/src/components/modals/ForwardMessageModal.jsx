import React, { useState, useEffect } from 'react';
import api from '../../utils/api';
import { FaSearch, FaPaperPlane } from 'react-icons/fa';

const ForwardMessageModal = ({ show, onClose, onForward }) => {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState([]);
    const [recentChats, setRecentChats] = useState([]);

    useEffect(() => {
        if (show) {
            // Fetch recent chats
            api.get('/messages/conversations').then(res => {
                setRecentChats(Array.isArray(res) ? res : []);
            });
        }
    }, [show]);

    useEffect(() => {
        const delay = setTimeout(async () => {
            if (searchTerm.trim()) {
                try {
                    const res = await api.get(`/messages/search/users?q=${searchTerm}`);
                    setResults(Array.isArray(res) ? res : []);
                } catch (e) { console.error(e); }
            } else {
                setResults([]);
            }
        }, 500);
        return () => clearTimeout(delay);
    }, [searchTerm]);

    if (!show) return null;

    const list = searchTerm ? results : recentChats;

    const getAvatar = (item) => {
        if (item.otherUser) return item.otherUser.profilePicture;
        return item.profilePicture;
    };

    const getName = (item) => {
        if (item.otherUser) return `${item.otherUser.firstName} ${item.otherUser.lastName}`;
        return `${item.firstName} ${item.lastName}`;
    };

    const getId = (item) => {
        if (item.otherUser) return item.otherUser._id;
        return item._id;
    };

    const getInitials = (item) => {
        let u = item.otherUser || item;
        const f = u.firstName ? u.firstName.charAt(0) : (u.name ? u.name.charAt(0) : '');
        const l = u.lastName ? u.lastName.charAt(0) : (u.name && u.name.includes(' ') ? u.name.split(' ').pop().charAt(0) : '');
        return (f + l).toUpperCase() || 'U';
    };

    return (
        <div
            className="modal show d-block animate-fade-in"
            tabIndex="-1"
            style={{ backgroundColor: 'rgba(0, 0, 0, 0.55)', backdropFilter: 'blur(4px)', zIndex: 1080 }}
            onClick={onClose}
        >
            <div
                className="modal-dialog modal-dialog-centered mx-2 mx-sm-auto"
                style={{ maxWidth: '420px' }}
                onClick={e => e.stopPropagation()}
            >
                <div className="modal-content border-0 shadow-lg rounded-4 overflow-hidden">
                    <div className="modal-header border-bottom py-3 px-3.5 bg-white d-flex align-items-center justify-content-between">
                        <div className="d-flex align-items-center gap-2">
                            <FaPaperPlane className="text-primary" size={14} />
                            <h6 className="modal-title fw-bold text-dark mb-0 font-outfit">Forward Message</h6>
                        </div>
                        <button type="button" className="btn-close" onClick={onClose} />
                    </div>
                    <div className="modal-body p-3 bg-white">
                        <div className="position-relative mb-3">
                            <span className="position-absolute start-0 ms-3 top-50 translate-middle-y text-muted" style={{ pointerEvents: 'none' }}>
                                <FaSearch size={13} />
                            </span>
                            <input
                                className="form-control border bg-light rounded-pill ps-5 pe-3 py-2"
                                placeholder="Search people or chats..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                                style={{ fontSize: '0.875rem' }}
                            />
                        </div>
                        <div className="list-group list-group-flush overflow-auto custom-scrollbar" style={{ maxHeight: '320px' }}>
                            {list.map(item => {
                                const id = getId(item);
                                if (!id) return null;
                                return (
                                    <button
                                        key={id}
                                        type="button"
                                        className="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2.5 rounded-3 border-0 mb-1 hover-bg-light transition-all"
                                        onClick={() => onForward(id)}
                                    >
                                        <div className="d-flex align-items-center min-w-0 me-2">
                                            {getAvatar(item) ? (
                                                <img
                                                    src={getAvatar(item)}
                                                    className="rounded-circle me-2.5 border object-fit-cover shadow-xs flex-shrink-0"
                                                    width="36"
                                                    height="36"
                                                    alt=""
                                                />
                                            ) : (
                                                <div
                                                    className="rounded-circle me-2.5 bg-light border d-flex align-items-center justify-content-center text-primary fw-bold flex-shrink-0 shadow-xs"
                                                    style={{ width: '36px', height: '36px' }}
                                                >
                                                    <small>{getInitials(item)}</small>
                                                </div>
                                            )}
                                            <span className="fw-semibold text-dark text-truncate" style={{ fontSize: '0.875rem' }}>
                                                {getName(item)}
                                            </span>
                                        </div>
                                        <span className="btn btn-sm btn-primary rounded-pill px-3 py-1 flex-shrink-0" style={{ fontSize: '0.75rem' }}>
                                            Send
                                        </span>
                                    </button>
                                );
                            })}
                            {list.length === 0 && (
                                <div className="text-center text-muted py-4 small">
                                    No people found matching "{searchTerm}"
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForwardMessageModal;
