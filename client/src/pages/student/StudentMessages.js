import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { toast } from 'react-toastify';
import { FaEnvelope, FaPen } from 'react-icons/fa6';
import StudentMessagesSkeleton from '../../components/skeletons/StudentMessagesSkeleton';

const StudentMessages = () => {
    const { user } = useAuth();
    const [messages, setMessages] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState({ toDept: 'ADMIN', subject: '', body: '' });

    const loadMessages = useCallback(() => {
        setTimeout(() => {
            const all = JSON.parse(localStorage.getItem('ucc_messages_local') || '[]');
            const myMsgs = all.filter(m => m.studentId === user.studentId);
            setMessages(myMsgs);
            setLoading(false);
        }, 800);
    }, [user]);

    useEffect(() => {
        loadMessages();
    }, [loadMessages]);

    if (loading) return <StudentMessagesSkeleton />;

    const sendMessage = () => {
        if (!form.subject || !form.body) {
            toast.error("Please fill all fields");
            return;
        }

        const msg = {
            studentId: user.studentId,
            toDept: form.toDept,
            subject: form.subject,
            body: form.body,
            date: new Date()
        };

        const all = JSON.parse(localStorage.getItem('ucc_messages_local') || '[]');
        all.push(msg);
        localStorage.setItem('ucc_messages_local', JSON.stringify(all));

        toast.success("Message sent successfully!");
        setShowModal(false);
        setForm({ toDept: 'ADMIN', subject: '', body: '' });
        loadMessages();
    };

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="text-success"><FaEnvelope className="me-2" />My Inquiries</h2>
                <button className="btn btn-success" onClick={() => setShowModal(true)}>
                    <FaPen className="me-2" /> New Message
                </button>
            </div>

            <div className="list-group">
                {messages.length === 0 ? (
                    <p className="text-muted text-center py-5">No messages sent yet.</p>
                ) : (
                    messages.map((msg, idx) => (
                        <div className="list-group-item" key={idx}>
                            <div className="d-flex w-100 justify-content-between">
                                <h5 className="mb-1">{msg.subject}</h5>
                                <small className="text-muted">{new Date(msg.date).toLocaleDateString()}</small>
                            </div>
                            <p className="mb-1">{msg.body}</p>
                            <small className="text-success">To: {msg.toDept}</small>
                        </div>
                    ))
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-success text-white">
                                <h5 className="modal-title">Send Inquiry</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowModal(false)}></button>
                            </div>
                            <div className="modal-body">
                                <div className="mb-3">
                                    <label className="form-label">To Department</label>
                                    <select className="form-select" value={form.toDept} onChange={e => setForm({...form, toDept: e.target.value})}>
                                        <option value="ADMIN">Admin / Help Desk</option>
                                        <option value="CCS">College of Computer Studies</option>
                                        <option value="CBA">College of Business Administration</option>
                                        <option value="CAS">College of Arts and Sciences</option>
                                    </select>
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Subject</label>
                                    <input className="form-control" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Message</label>
                                    <textarea className="form-control" rows="4" value={form.body} onChange={e => setForm({...form, body: e.target.value})}></textarea>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                                <button className="btn btn-success" onClick={sendMessage}>Send</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default StudentMessages;
