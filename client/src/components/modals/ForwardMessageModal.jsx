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
        // item can be user (search) or conversation (recent)
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

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="modal-dialog modal-dialog-centered">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title">Forward Message</h5>
                        <button type="button" className="btn-close" onClick={onClose}></button>
                    </div>
                    <div className="modal-body">
                        <div className="input-group mb-3">
                            <span className="input-group-text bg-light border-0"><FaSearch /></span>
                            <input
                                className="form-control bg-light border-0"
                                placeholder="Search people..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="list-group list-group-flush overflow-auto" style={{ maxHeight: '300px' }}>
                            {list.map(item => {
                                const id = getId(item);
                                if (!id) return null;
                                return (
                                    <button key={id} className="list-group-item list-group-item-action d-flex align-items-center justify-content-between" onClick={() => onForward(id)}>
                                        <div className="d-flex align-items-center">
                                            <img src={getAvatar(item) || "https://via.placeholder.com/32"} className="rounded-circle me-3" width="32" height="32" alt="" style={{objectFit: 'cover'}}/>
                                            <span>{getName(item)}</span>
                                        </div>
                                        <FaPaperPlane className="text-muted" />
                                    </button>
                                );
                            })}
                            {list.length === 0 && <div className="text-center text-muted p-3">No results</div>}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForwardMessageModal;
