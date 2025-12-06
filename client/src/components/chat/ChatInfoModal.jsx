import React, { useState } from 'react';
import { FaXmark, FaBellSlash, FaTrash, FaBan, FaPalette, FaPen, FaFaceSmile } from 'react-icons/fa6';
import UserAvatar from './UserAvatar';
import EmojiPicker from 'emoji-picker-react';
import ThemeModal from './ThemeModal';
import { toast } from 'react-toastify';

const ChatInfoModal = ({ show, onClose, user, conversation, currentUser, onDelete, onBlock, onMute, onUpdateSettings, nickname, isMuted }) => {
    if (!show) return null;

    const [showThemeModal, setShowThemeModal] = useState(false);
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const [editingNickname, setEditingNickname] = useState(false);
    const [tempNickname, setTempNickname] = useState(nickname || '');

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="bg-white rounded-3 shadow d-flex flex-column overflow-hidden" style={{ width: '350px', maxHeight: '90vh' }}>
                <div className="p-3 border-bottom d-flex align-items-center justify-content-between">
                    <h5 className="mb-0 fw-bold">Chat Info</h5>
                    <button className="btn-close" onClick={onClose}></button>
                </div>

                <div className="overflow-auto flex-grow-1">
                    <div className="p-4 d-flex flex-column align-items-center text-center">
                        <UserAvatar user={user} size={80} showOnlineStatus={true} isOnline={user.isOnline} />
                        <h5 className="mt-3 fw-bold">{nickname || user.firstName} {user.lastName}</h5>
                        <p className="text-muted small">Student</p>
                    </div>

                    <div className="px-3 py-2">
                         <h6 className="text-muted small fw-bold mb-2">CUSTOMIZE CHAT</h6>
                         <div className="list-group list-group-flush">
                             <div className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-2 border-0 cursor-pointer" onClick={() => setShowThemeModal(true)}>
                                 <FaPalette className="text-primary" />
                                 <span className="flex-grow-1">Change Theme</span>
                                 <div className="rounded-circle border" style={{width: 16, height: 16, background: conversation.theme}}></div>
                             </div>

                             <div className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-2 border-0 cursor-pointer position-relative" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>
                                 <span className="text-primary fs-5">{conversation.quickReaction}</span>
                                 <span className="flex-grow-1">Change Emoji</span>
                             </div>
                             {showEmojiPicker && (
                                 <div className="position-absolute start-0 end-0 z-3 d-flex justify-content-center" style={{marginTop: -50}}>
                                     <div className="shadow-lg rounded-3">
                                         <EmojiPicker
                                             width={300}
                                             height={350}
                                             onEmojiClick={(e) => {
                                                 onUpdateSettings({ quickReaction: e.emoji });
                                                 setShowEmojiPicker(false);
                                             }}
                                         />
                                     </div>
                                 </div>
                             )}

                             <div className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-2 border-0 cursor-pointer" onClick={() => setEditingNickname(!editingNickname)}>
                                 <FaPen className="text-primary" /> Edit Nicknames
                             </div>

                             {editingNickname && (
                                 <div className="p-2 bg-light rounded mb-2">
                                     <label className="small fw-bold mb-1">Nickname for {user.firstName}</label>
                                     <div className="input-group input-group-sm">
                                         <input
                                             type="text"
                                             className="form-control"
                                             placeholder={user.firstName}
                                             defaultValue={nickname}
                                             onChange={e => setTempNickname(e.target.value)}
                                         />
                                         <button className="btn btn-primary" onClick={() => {
                                             onUpdateSettings({ nicknames: { ...conversation.nicknames, [user._id]: tempNickname } });
                                             setEditingNickname(false);
                                         }}>Save</button>
                                     </div>
                                 </div>
                             )}
                         </div>
                     </div>

                     <div className="px-3 py-2">
                         <h6 className="text-muted small fw-bold mb-2">PRIVACY & SUPPORT</h6>
                         <div className="list-group list-group-flush">
                             <div className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 border-0 cursor-pointer" onClick={onMute}>
                                 <FaBellSlash />
                                 <span className="flex-grow-1">{isMuted ? 'Unmute Notifications' : 'Mute Notifications'}</span>
                             </div>
                             <div className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 border-0 text-danger cursor-pointer" onClick={onDelete}>
                                 <FaTrash /> Delete Conversation
                             </div>
                             <div className="list-group-item list-group-item-action d-flex align-items-center gap-3 py-3 border-0 text-danger cursor-pointer" onClick={onBlock}>
                                 <FaBan /> Block User
                             </div>
                         </div>
                     </div>
                </div>
            </div>

            <ThemeModal
                show={showThemeModal}
                onClose={() => setShowThemeModal(false)}
                onSelect={(color) => onUpdateSettings({ theme: color })}
                currentTheme={conversation.theme}
            />
        </div>
    );
};

export default ChatInfoModal;
