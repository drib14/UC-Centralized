import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import { FaPalette, FaUserPen, FaBan, FaBoxArchive, FaTrash, FaVolumeXmark } from 'react-icons/fa6';
import api from '../../utils/api';
import { toast } from 'react-toastify';

const ChatSettingsModal = ({ show, onHide, conversation, currentUser, onChange }) => {
    const [theme, setTheme] = useState(conversation?.theme || 'default');
    const [nicknameMap, setNicknameMap] = useState(conversation?.nicknames || {});

    // Convert map/obj to editable list
    const participants = conversation?.participants || [];

    // Check local status
    const isMuted = conversation?.mutedBy?.includes(currentUser._id);
    const isArchived = conversation?.archivedBy?.includes(currentUser._id);

    const handleSaveTheme = async () => {
        try {
            await api.put(`/messages/${conversation._id}/theme`, { theme });
            toast.success("Theme updated");
            onChange();
        } catch (err) { toast.error("Failed to update theme"); }
    };

    const handleSaveNickname = async (userId, val) => {
        try {
            await api.put(`/messages/${conversation._id}/nickname`, { userId, nickname: val });
            toast.success("Nickname updated");
            onChange();
        } catch (err) { toast.error("Failed to update nickname"); }
    };

    const handleToggleMute = async () => {
        try {
            await api.put(`/messages/${conversation._id}/mute`);
            toast.success(isMuted ? "Unmuted" : "Muted");
            onChange();
        } catch (err) { toast.error("Failed to mute/unmute"); }
    };

    const handleToggleArchive = async () => {
        try {
            await api.put(`/messages/${conversation._id}/archive`);
            toast.success(isArchived ? "Unarchived" : "Archived");
            onChange();
        } catch (err) { toast.error("Failed to archive/unarchive"); }
    };

    const handleDelete = async () => {
        if(!window.confirm("Are you sure? This is permanent for everyone.")) return;
        try {
            await api.delete(`/messages/${conversation._id}`);
            toast.success("Conversation deleted");
            onChange(); // Will likely clear selection in parent
            onHide();
        } catch (err) { toast.error("Failed to delete"); }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton className="border-0">
                <Modal.Title className="fw-bold">Chat Settings</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                {/* Theme Section */}
                <h6 className="fw-bold mb-3 d-flex align-items-center"><FaPalette className="me-2"/> Theme</h6>
                <div className="d-flex gap-2 mb-4">
                    {['default', 'ocean', 'sunset', 'midnight'].map(t => (
                        <div
                            key={t}
                            className={`rounded-circle cursor-pointer border ${theme === t ? 'border-primary border-3' : ''}`}
                            style={{ width: '40px', height: '40px', background: getThemeColor(t) }}
                            onClick={() => setTheme(t)}
                            title={t}
                        ></div>
                    ))}
                    <Button size="sm" variant="outline-primary" onClick={handleSaveTheme}>Apply</Button>
                </div>

                <hr />

                {/* Nicknames */}
                <h6 className="fw-bold mb-3 d-flex align-items-center"><FaUserPen className="me-2"/> Nicknames</h6>
                <div className="mb-4">
                    {participants.map(p => (
                        <div key={p._id} className="d-flex align-items-center mb-2">
                             <img src={p.profilePicture || "https://via.placeholder.com/30"} className="rounded-circle me-2" width="30" height="30" alt=""/>
                             <Form.Control
                                size="sm"
                                type="text"
                                placeholder={`${p.firstName} ${p.lastName}`}
                                defaultValue={nicknameMap[p._id] || ""}
                                onBlur={(e) => {
                                    if (e.target.value !== (nicknameMap[p._id] || "")) {
                                        handleSaveNickname(p._id, e.target.value);
                                    }
                                }}
                             />
                        </div>
                    ))}
                </div>

                <hr />

                {/* Actions */}
                <h6 className="fw-bold mb-3">Actions</h6>
                <div className="d-grid gap-2">
                    <Button variant={isMuted ? "secondary" : "outline-secondary"} onClick={handleToggleMute}>
                        <FaVolumeXmark className="me-2"/> {isMuted ? "Unmute Notifications" : "Mute Notifications"}
                    </Button>
                    <Button variant={isArchived ? "warning" : "outline-warning"} onClick={handleToggleArchive}>
                        <FaBoxArchive className="me-2"/> {isArchived ? "Unarchive Conversation" : "Archive Conversation"}
                    </Button>
                    <Button variant="outline-danger" onClick={handleDelete}>
                        <FaTrash className="me-2"/> Delete Conversation
                    </Button>
                </div>

            </Modal.Body>
        </Modal>
    );
};

// Helper for preview color
const getThemeColor = (t) => {
    switch(t) {
        case 'ocean': return '#006064';
        case 'sunset': return '#e65100';
        case 'midnight': return '#1a202c';
        default: return '#003399';
    }
};

export default ChatSettingsModal;
