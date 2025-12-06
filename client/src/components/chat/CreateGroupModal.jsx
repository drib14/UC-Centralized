import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import API from '../../utils/api';
import { useChat } from '../../context/ChatContext';
import { toast } from 'react-toastify';

const CreateGroupModal = ({ show, onHide }) => {
    const { setSelectedConversation } = useChat();
    const [name, setName] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedUsers, setSelectedUsers] = useState([]);

    const handleSearch = async (e) => {
        const q = e.target.value;
        setSearchTerm(q);
        if(!q) {
            setSearchResults([]);
            return;
        }
        try {
            const res = await API.get(`/messages/search/global?q=${q}`);
            setSearchResults(res.users);
        } catch(e){}
    };

    const toggleUser = (user) => {
        if(selectedUsers.find(u => u._id === user._id)) {
            setSelectedUsers(prev => prev.filter(u => u._id !== user._id));
        } else {
            setSelectedUsers(prev => [...prev, user]);
        }
    };

    const createGroup = async () => {
        if (!name || selectedUsers.length === 0) return toast.error("Name and members required");
        try {
            // Ensure payload matches backend expectation: groupName, groupPhoto, participants, isGroup
            const res = await API.post('/messages/conversations', {
                isGroup: true,
                groupName: name,
                participants: selectedUsers.map(u => u._id)
            });

            // Backend returns 201 created.
            setSelectedConversation(res);
            onHide();
            toast.success("Group created");
            setName('');
            setSelectedUsers([]);
            setSearchTerm('');
        } catch(e) {
            console.error(e);
            toast.error("Failed to create group");
        }
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Create Group Chat</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <Form.Group className="mb-3">
                    <Form.Label>Group Name</Form.Label>
                    <Form.Control value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Research Team" />
                </Form.Group>

                <Form.Group className="mb-3">
                    <Form.Label>Add Members</Form.Label>
                    <Form.Control value={searchTerm} onChange={handleSearch} placeholder="Search users..." />
                    <div className="list-group mt-2" style={{maxHeight: 200, overflowY: 'auto'}}>
                        {searchResults.map(u => (
                            <div key={u._id} className="list-group-item cursor-pointer d-flex justify-content-between align-items-center" onClick={() => toggleUser(u)}>
                                <span>{u.firstName} {u.lastName}</span>
                                {selectedUsers.find(s => s._id === u._id) ?
                                    <span className="text-primary fw-bold">✓</span> :
                                    <span className="text-muted">+</span>
                                }
                            </div>
                        ))}
                    </div>
                </Form.Group>

                {selectedUsers.length > 0 && (
                    <div className="d-flex gap-2 flex-wrap mt-3">
                        {selectedUsers.map(u => (
                            <span key={u._id} className="badge bg-primary rounded-pill p-2 cursor-pointer" onClick={() => toggleUser(u)}>
                                {u.firstName} ✕
                            </span>
                        ))}
                    </div>
                )}
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={createGroup}>Create Group</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default CreateGroupModal;
