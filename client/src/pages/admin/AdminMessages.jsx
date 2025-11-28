import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { FaReply } from 'react-icons/fa6';
import AdminMessagesSkeleton from '../../components/skeletons/AdminMessagesSkeleton';

const AdminMessages = () => {
    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showReply, setShowReply] = useState(false);
    const [replyData, setReplyData] = useState({ student: '', subject: '', body: '' });

    useEffect(() => { loadMessages(); }, []);

    const loadMessages = () => {
        setTimeout(() => {
            const all = JSON.parse(localStorage.getItem('ucc_messages_local') || '[]');
            setMessages(all);
            setLoading(false);
        }, 800);
    };

    if (loading) return <AdminMessagesSkeleton />;

    const handleReply = () => {
        toast.success("Reply sent successfully!");
        setShowReply(false);
    };

    return (
        <div className="container-fluid">
            <h2 className="mb-4">Student Inquiries</h2>
            <div className="card shadow mb-4">
                <div className="card-body">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle">
                            <thead className="table-light"><tr><th>Date</th><th>Student</th><th>Department</th><th>Subject</th><th>Message</th><th>Action</th></tr></thead>
                            <tbody>
                                {messages.length === 0 ? <tr><td colSpan="6" className="text-center">No messages found.</td></tr> : messages.map((msg, idx) => (
                                    <tr key={idx}>
                                        <td>{new Date(msg.date).toLocaleDateString()}</td>
                                        <td>{msg.studentId}</td>
                                        <td><span className="badge bg-secondary">{msg.toDept}</span></td>
                                        <td className="fw-bold">{msg.subject}</td>
                                        <td>{msg.body.substring(0, 50)}...</td>
                                        <td><button className="btn btn-sm btn-primary" onClick={() => { setReplyData({ student: msg.studentId, subject: msg.subject, body: '' }); setShowReply(true); }}><FaReply /> Reply</button></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {showReply && (
                <div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white"><h5 className="modal-title">Reply to Message</h5><button className="btn-close btn-close-white" onClick={() => setShowReply(false)}></button></div>
                            <div className="modal-body">
                                <p><strong>To:</strong> {replyData.student}</p>
                                <p><strong>Subject:</strong> Re: {replyData.subject}</p>
                                <textarea className="form-control" rows="5" placeholder="Type your reply here..." value={replyData.body} onChange={e => setReplyData({...replyData, body: e.target.value})}></textarea>
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowReply(false)}>Close</button><button className="btn btn-primary" onClick={handleReply}>Send Reply</button></div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default AdminMessages;
