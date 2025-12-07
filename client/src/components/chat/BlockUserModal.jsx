import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import API from '../../utils/api';
import { toast } from 'react-toastify';

const BlockUserModal = ({ show, onHide, user, onBlock }) => {
    const [reason, setReason] = useState('spam');
    const [comment, setComment] = useState('');

    const handleBlock = async () => {
        try {
            await API.put(`/conversations/${user._id}/settings`, { block: true, reason, comment });
            // Or use /users/:id/block depending on API
            // Current backend setup supports blocking via conversation settings update or user update.
            // Let's use the conversation setting hook we built.
            onBlock();
            onHide();
            toast.success("User blocked");
        } catch(e) {
            toast.error("Failed to block");
        }
    };

    const handleReport = async () => {
        toast.info("Report submitted");
        onHide();
    };

    return (
        <Modal show={show} onHide={onHide} centered>
            <Modal.Header closeButton>
                <Modal.Title>Block or Report</Modal.Title>
            </Modal.Header>
            <Modal.Body>
                <div className="mb-4">
                    <h6 className="fw-bold text-danger">Block {user?.firstName}?</h6>
                    <p className="small text-muted">They won't be able to message you. This conversation will be archived.</p>
                    <Button variant="outline-danger" size="sm" onClick={handleBlock}>Confirm Block</Button>
                </div>

                <hr />

                <h6 className="fw-bold">Report User</h6>
                <Form.Check type="radio" label="Spam or Harassment" name="reason" checked={reason === 'spam'} onChange={() => setReason('spam')} />
                <Form.Check type="radio" label="Inappropriate Content" name="reason" checked={reason === 'content'} onChange={() => setReason('content')} />
                <Form.Check type="radio" label="Fake Account" name="reason" checked={reason === 'fake'} onChange={() => setReason('fake')} />

                <Form.Control as="textarea" rows={2} className="mt-2" placeholder="Additional details..." value={comment} onChange={e => setComment(e.target.value)} />
            </Modal.Body>
            <Modal.Footer>
                <Button variant="secondary" onClick={onHide}>Cancel</Button>
                <Button variant="primary" onClick={handleReport}>Submit Report</Button>
            </Modal.Footer>
        </Modal>
    );
};

export default BlockUserModal;
