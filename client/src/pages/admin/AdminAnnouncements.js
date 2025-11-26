import React, { useEffect, useState } from 'react';
import AdminAnnouncementsSkeleton from '../../components/skeletons/AdminAnnouncementsSkeleton';
import API from '../../utils/api';
import { toast } from 'react-toastify';
import { FaPlus, FaTrash } from 'react-icons/fa6';

const AdminAnnouncements = () => {
    const [announcements, setAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreate, setShowCreate] = useState(false);
    const [form, setForm] = useState({
        title: '',
        message: '',
        target: 'ALL',
        department: '',
        program: '',
        yearLevel: ''
    });
    const [deleteId, setDeleteId] = useState(null);
    const [showDelete, setShowDelete] = useState(false);

    useEffect(() => { loadAnnouncements(); }, []);

    const loadAnnouncements = async () => {
        try {
            const data = await API.getAnnouncements();
            setAnnouncements(data);
        } catch (e) { toast.error("Failed to load announcements"); }
        finally { setLoading(false); }
    };

    const handleCreate = async () => {
        try {
            await API.createAnnouncement(form);
            toast.success("Announcement posted");
            setShowCreate(false);
            setForm({
                title: '',
                message: '',
                target: 'ALL',
                department: '',
                program: '',
                yearLevel: ''
            });
            loadAnnouncements();
        } catch(e) { toast.error(e.message); }
    };

    const handleDelete = async () => {
        try {
            await API.deleteAnnouncement(deleteId);
            toast.success("Announcement deleted");
            setShowDelete(false);
            loadAnnouncements();
        } catch(e) { toast.error("Failed to delete"); }
    };

    if (loading) return <AdminAnnouncementsSkeleton />;

    return (
        <div className="container-fluid">
            <div className="d-flex justify-content-between align-items-center mb-4">
                <h2>Announcements</h2>
                <button className="btn btn-primary" onClick={() => setShowCreate(true)}><FaPlus className="me-2" />Post New</button>
            </div>

            <div className="row">
                <div className="col-12">
                    {announcements.map(ann => (
                        <div className="card mb-3" key={ann._id}>
                            <div className="card-body">
                                <div className="d-flex justify-content-between align-items-start">
                                    <div>
                                        <h5 className="card-title">{ann.title}</h5>
                                        <h6 className="card-subtitle mb-2 text-muted">
                                            {new Date(ann.createdAt).toLocaleDateString()} | {ann.department}
                                        </h6>
                                        <p className="card-text">{ann.message}</p>
                                    </div>
                                    <button className="btn btn-sm btn-outline-danger" onClick={() => { setDeleteId(ann._id); setShowDelete(true); }}><FaTrash /></button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Create Modal */}
            {showCreate && (
                <div className="modal fade show d-block" style={{backgroundColor:'rgba(0,0,0,0.5)'}}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-primary text-white"><h5 className="modal-title">Post Announcement</h5><button className="btn-close btn-close-white" onClick={() => setShowCreate(false)}></button></div>
                            <div className="modal-body">
                                <input className="form-control mb-3" placeholder="Title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} />
                                <textarea className="form-control mb-3" rows="4" placeholder="Message" value={form.message} onChange={e => setForm({...form, message: e.target.value})}></textarea>
                                <select className="form-select mb-3" value={form.target} onChange={e => setForm({...form, target: e.target.value})}>
                                    <option value="ALL">All Students</option>
                                    <option value="DEPARTMENT">By Department</option>
                                    <option value="PROGRAM">By Program</option>
                                    <option value="YEAR_LEVEL">By Year Level</option>
                                </select>
                                {form.target === 'DEPARTMENT' && (
                                    <select className="form-select mb-3" value={form.department} onChange={e => setForm({...form, department: e.target.value})}>
                                        <option value="">Select Department</option>
                                        <option value="CCS">CCS</option>
                                        <option value="CBA">CBA</option>
                                        <option value="CAS">CAS</option>
                                    </select>
                                )}
                                {form.target === 'PROGRAM' && (
                                    <input className="form-control mb-3" placeholder="Program (e.g., BSIT)" value={form.program} onChange={e => setForm({...form, program: e.target.value})} />
                                )}
                                {form.target === 'YEAR_LEVEL' && (
                                    <input type="number" className="form-control mb-3" placeholder="Year Level (e.g., 4)" value={form.yearLevel} onChange={e => setForm({...form, yearLevel: e.target.value})} />
                                )}
                            </div>
                            <div className="modal-footer"><button className="btn btn-secondary" onClick={() => setShowCreate(false)}>Cancel</button><button className="btn btn-primary" onClick={handleCreate}>Post</button></div>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Modal */}
             {showDelete && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header bg-danger text-white">
                                <h5 className="modal-title">Confirm Delete</h5>
                                <button className="btn-close btn-close-white" onClick={() => setShowDelete(false)}></button>
                            </div>
                            <div className="modal-body"><p>Delete this announcement?</p></div>
                            <div className="modal-footer">
                                <button className="btn btn-secondary" onClick={() => setShowDelete(false)}>Cancel</button>
                                <button className="btn btn-danger" onClick={handleDelete}>Delete</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
export default AdminAnnouncements;
