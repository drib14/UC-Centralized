import React, { useState } from 'react';
import { FaSearch } from 'react-icons/fa';
import API from '../../utils/api';

const ChatSidebar = ({ conversations, selectedId, onSelect, onNewChat, currentUser }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e) => {
        const query = e.target.value;
        setSearchTerm(query);

        if (query.length > 2) {
            try {
                const results = await API.searchUsers(query);
                // Filter out current user
                setSearchResults(results.filter(u => u._id !== currentUser._id));
                setIsSearching(true);
            } catch (err) {
                console.error(err);
            }
        } else {
            setSearchResults([]);
            setIsSearching(false);
        }
    };

    const getOtherParticipant = (conv) => {
        return conv.participants.find(p => p._id !== currentUser._id) || {};
    };

    const renderAvatar = (user) => {
        if (user.profileImage) {
            return <img src={user.profileImage} alt="avatar" className="rounded-circle" width="40" height="40" style={{objectFit:'cover'}} />;
        }
        return (
            <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center" style={{width:'40px', height:'40px'}}>
                {user.firstName ? user.firstName[0] : 'U'}
            </div>
        );
    };

    return (
        <div className="d-flex flex-column h-100">
            <div className="p-3 border-bottom">
                <div className="input-group">
                    <span className="input-group-text bg-light border-end-0"><FaSearch className="text-muted" /></span>
                    <input
                        type="text"
                        className="form-control border-start-0 bg-light"
                        placeholder="Search people..."
                        value={searchTerm}
                        onChange={handleSearch}
                    />
                </div>
            </div>

            <div className="flex-grow-1 overflow-auto">
                {isSearching ? (
                    <ul className="list-group list-group-flush">
                        {searchResults.length === 0 && <li className="list-group-item text-muted text-center p-3">No user found</li>}
                        {searchResults.map(user => (
                            <li
                                key={user._id}
                                className="list-group-item list-group-item-action cursor-pointer d-flex align-items-center gap-3 py-3"
                                onClick={() => {
                                    onNewChat(user);
                                    setSearchTerm('');
                                    setIsSearching(false);
                                }}
                                style={{cursor: 'pointer'}}
                            >
                                {renderAvatar(user)}
                                <div>
                                    <h6 className="mb-0">{user.firstName} {user.lastName}</h6>
                                    <small className="text-muted">{user.role} • {user.studentId}</small>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <ul className="list-group list-group-flush">
                        {conversations.length === 0 && <li className="list-group-item text-muted text-center p-5">No conversations yet</li>}
                        {conversations.map(conv => {
                            const other = getOtherParticipant(conv);
                            const isActive = selectedId === conv._id;
                            return (
                                <li
                                    key={conv._id}
                                    className={`list-group-item list-group-item-action cursor-pointer d-flex align-items-center gap-3 py-3 ${isActive ? 'bg-light border-start border-primary border-4' : ''}`}
                                    onClick={() => onSelect(conv)}
                                    style={{cursor: 'pointer', borderLeft: isActive ? '4px solid #0d6efd' : '4px solid transparent'}}
                                >
                                    {renderAvatar(other)}
                                    <div className="flex-grow-1 overflow-hidden">
                                        <div className="d-flex justify-content-between">
                                            <h6 className="mb-0 text-truncate">{other.firstName} {other.lastName}</h6>
                                            {conv.lastMessage && (
                                                <small className="text-muted" style={{fontSize: '0.75rem'}}>
                                                    {new Date(conv.updatedAt).toLocaleDateString()}
                                                </small>
                                            )}
                                        </div>
                                        <small className="text-muted text-truncate d-block">
                                            {conv.lastMessage ? (
                                                <span>{conv.lastMessage.sender === currentUser._id ? 'You: ' : ''}{conv.lastMessage.content}</span>
                                            ) : (
                                                <span className="fst-italic">Start chatting...</span>
                                            )}
                                        </small>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default ChatSidebar;
