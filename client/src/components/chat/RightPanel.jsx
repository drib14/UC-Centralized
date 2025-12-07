import React, { useState, useEffect } from 'react';
import API from '../../utils/api';
import { useChat } from '../../context/ChatContext';
import { useAuth } from '../../context/AuthContext';
import UserAvatar from './UserAvatar';
import { toast } from 'react-toastify';
import BlockUserModal from './BlockUserModal';

const RightPanel = () => {
    const { selectedConversation } = useChat();
    const { user } = useAuth();
    const [media, setMedia] = useState([]);
    const [files, setFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('overview'); // overview, media, files
    const [showBlockModal, setShowBlockModal] = useState(false);

    useEffect(() => {
        if (selectedConversation) {
            loadData('media');
            loadData('docs');
        }
    }, [selectedConversation]);

    const loadData = async (type) => {
        try {
            const res = await API.get(`/messages/${selectedConversation._id}/media?type=${type}`);
            if (type === 'media') setMedia(res);
            else setFiles(res);
        } catch(e) { console.error(e); }
    };

    if (!selectedConversation) return null;

    let title = "";
    let image = null;
    let otherUser = null;

    if (selectedConversation.type === 'group') {
        title = selectedConversation.name;
        image = selectedConversation.image;
    } else {
        const other = selectedConversation.participants.find(p => p._id !== user._id) || selectedConversation.participants[0];
        title = `${other.firstName} ${other.lastName}`;
        image = other.profileImage;
        otherUser = other;
    }

    return (
        <div className="d-flex flex-column h-100 border-start bg-white">
            <div className="p-4 d-flex flex-column align-items-center border-bottom">
                <UserAvatar user={selectedConversation.type === 'group' ? { firstName: title, profileImage: image } : otherUser} size={80} />
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
                        <button className="btn btn-light w-100 text-start" onClick={() => toast.info("Search coming soon")}>Search in Conversation</button>
                        <button className="btn btn-light w-100 text-start" onClick={() => toast.info("Theme settings coming soon")}>Change Theme</button>
                        <button className="btn btn-light w-100 text-start" onClick={() => toast.info("Notification settings coming soon")}>Notifications</button>

                        {selectedConversation.type === 'group' && (
                            <div className="mt-3">
                                <h6 className="fw-bold">Members ({selectedConversation.participants.length})</h6>
                                <div className="d-flex flex-column gap-2 mt-2">
                                    {selectedConversation.participants.map(p => (
                                        <div key={p._id} className="d-flex align-items-center gap-2">
                                            <UserAvatar user={p} size={30} />
                                            <small className="text-truncate">{p.firstName} {p.lastName}</small>
                                            {selectedConversation.admins.includes(p._id) && <span className="badge bg-secondary ms-auto" style={{fontSize: '0.6em'}}>Admin</span>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {selectedConversation.type !== 'group' && (
                            <div className="mt-4 border-top pt-3">
                                <button className="btn btn-outline-danger w-100 mb-2" onClick={() => setShowBlockModal(true)}>Block / Report</button>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'media' && (
                    <div className="row g-2">
                        {media.length > 0 ? media.map(m => (
                            <div key={m._id} className="col-4">
                                {m.type === 'image' ? (
                                    <img src={m.url} className="img-fluid rounded square-crop" style={{aspectRatio: '1/1', objectFit: 'cover', cursor: 'pointer'}} onClick={() => window.open(m.url, '_blank')} />
                                ) : (
                                    <video src={m.url} className="img-fluid rounded" />
                                )}
                            </div>
                        )) : <div className="text-center text-muted w-100">No media shared</div>}
                    </div>
                )}

                {activeTab === 'files' && (
                    <div className="d-flex flex-column gap-2">
                        {files.length > 0 ? files.map(f => (
                            <div key={f._id} className="d-flex align-items-center gap-2 p-2 border rounded bg-light cursor-pointer" onClick={() => window.open(f.url, '_blank')}>
                                <div className="text-truncate fw-bold" style={{maxWidth: '80%'}}>{f.name}</div>
                                <small className="ms-auto text-muted">Download</small>
                            </div>
                        )) : <div className="text-center text-muted w-100">No files shared</div>}
                    </div>
                )}
            </div>

            <BlockUserModal
                show={showBlockModal}
                onHide={() => setShowBlockModal(false)}
                user={otherUser}
                onBlock={() => setShowBlockModal(false)}
            />
        </div>
    );
};

export default RightPanel;
