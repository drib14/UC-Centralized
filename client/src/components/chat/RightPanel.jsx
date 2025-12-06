import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from './UserAvatar';

const RightPanel = () => {
    const { selectedConversation } = useChat();
    const { user } = useAuth();
    const [media, setMedia] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // overview, media, files

    useEffect(() => {
        if (selectedConversation) {
            loadMedia();
        }
    }, [selectedConversation]);

    const loadMedia = async () => {
        try {
            const res = await API.get(`/messages/${selectedConversation._id}/media`);
            setMedia(res);
        } catch(e) { console.error(e); }
    };

    if (!selectedConversation) return null;

    let title = "";
    let image = null;
    if (selectedConversation.type === 'group') {
        title = selectedConversation.name;
        image = selectedConversation.image;
    } else {
        const other = selectedConversation.participants.find(p => p._id !== user._id) || selectedConversation.participants[0];
        title = `${other.firstName} ${other.lastName}`;
        image = other.profileImage;
    }

    return (
        <div className="d-flex flex-column h-100 border-start bg-white">
            <div className="p-4 d-flex flex-column align-items-center border-bottom">
                <UserAvatar user={{ firstName: title, lastName: '', profileImage: image }} size={80} />
                <h5 className="mt-2 mb-0 fw-bold text-center">{title}</h5>
                <small className="text-muted">{selectedConversation.type === 'group' ? 'Group' : 'Student'}</small>
            </div>

            <div className="d-flex justify-content-around p-2 border-bottom">
                <div className={`cursor-pointer ${activeTab === 'overview' ? 'text-primary fw-bold' : 'text-muted'}`} onClick={() => setActiveTab('overview')}>Overview</div>
                <div className={`cursor-pointer ${activeTab === 'media' ? 'text-primary fw-bold' : 'text-muted'}`} onClick={() => setActiveTab('media')}>Media</div>
                <div className={`cursor-pointer ${activeTab === 'files' ? 'text-primary fw-bold' : 'text-muted'}`} onClick={() => setActiveTab('files')}>Files</div>
            </div>

            <div className="flex-grow-1 overflow-auto p-3">
                {activeTab === 'overview' && (
                    <div className="d-flex flex-column gap-2">
                        {/* Options */}
                        <button className="btn btn-light w-100 text-start">Search in Conversation</button>
                        <button className="btn btn-light w-100 text-start">Change Theme</button>
                        <button className="btn btn-light w-100 text-start">Notifications</button>

                        {selectedConversation.type === 'group' && (
                            <div className="mt-3">
                                <h6 className="fw-bold">Members</h6>
                                {selectedConversation.participants.map(p => (
                                    <div key={p._id} className="d-flex align-items-center gap-2 mb-2">
                                        <UserAvatar user={p} size={30} />
                                        <small>{p.firstName} {p.lastName}</small>
                                        {selectedConversation.admins.includes(p._id) && <span className="badge bg-secondary ms-auto">Admin</span>}
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="mt-4 border-top pt-3">
                            <button className="btn btn-outline-danger w-100 mb-2">Block</button>
                            <button className="btn btn-danger w-100">Report</button>
                        </div>
                    </div>
                )}

                {activeTab === 'media' && (
                    <div className="row g-2">
                        {media.filter(m => ['image', 'video'].includes(m.type)).map(m => (
                            <div key={m._id} className="col-4">
                                {m.type === 'image' ? (
                                    <img src={m.url} className="img-fluid rounded square-crop" style={{aspectRatio: '1/1', objectFit: 'cover'}} />
                                ) : (
                                    <video src={m.url} className="img-fluid rounded" />
                                )}
                            </div>
                        ))}
                        {media.length === 0 && <div className="text-center text-muted w-100">No media shared</div>}
                    </div>
                )}
            </div>
        </div>
    );
};

export default RightPanel;
