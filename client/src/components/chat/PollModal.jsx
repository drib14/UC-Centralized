import React, { useState } from 'react';
import { FaXmark, FaCheck, FaPlus, FaTrash } from 'react-icons/fa6';
import { toast } from 'react-toastify';

const PollModal = ({ show, onClose, onSubmit }) => {
    const [question, setQuestion] = useState('');
    const [options, setOptions] = useState(['', '']);
    const [allowMultiple, setAllowMultiple] = useState(false);

    if (!show) return null;

    const handleOptionChange = (index, value) => {
        const newOptions = [...options];
        newOptions[index] = value;
        setOptions(newOptions);
    };

    const addOption = () => {
        setOptions([...options, '']);
    };

    const removeOption = (index) => {
        if (options.length <= 2) return;
        setOptions(options.filter((_, i) => i !== index));
    };

    const handleSubmit = () => {
        if (!question.trim()) {
            return toast.error("Question cannot be empty");
        }
        const validOptions = options.filter(o => o.trim());
        if (validOptions.length < 2) {
            return toast.error("Please provide at least 2 options");
        }
        onSubmit({
            question,
            options: validOptions.map(text => ({ text, votes: [] })),
            allowMultipleAnswers: allowMultiple
        });
        onClose();
        // Reset
        setQuestion('');
        setOptions(['', '']);
        setAllowMultiple(false);
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-3" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
            <div className="bg-white rounded-3 shadow p-4 w-100" style={{ maxWidth: '500px' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h5 className="mb-0 fw-bold">Create Poll</h5>
                    <button className="btn-close" onClick={onClose}></button>
                </div>

                <div className="mb-3">
                    <label className="form-label fw-bold">Question</label>
                    <input
                        type="text"
                        className="form-control"
                        placeholder="Ask something..."
                        value={question}
                        onChange={e => setQuestion(e.target.value)}
                    />
                </div>

                <div className="mb-3">
                    <label className="form-label fw-bold">Options</label>
                    <div className="d-flex flex-column gap-2">
                        {options.map((opt, idx) => (
                            <div key={idx} className="d-flex gap-2">
                                <input
                                    type="text"
                                    className="form-control"
                                    placeholder={`Option ${idx + 1}`}
                                    value={opt}
                                    onChange={e => handleOptionChange(idx, e.target.value)}
                                />
                                {options.length > 2 && (
                                    <button className="btn btn-outline-danger" onClick={() => removeOption(idx)}>
                                        <FaTrash />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                    <button className="btn btn-link text-decoration-none mt-2 p-0" onClick={addOption}>
                        <FaPlus className="me-1" /> Add Option
                    </button>
                </div>

                <div className="form-check mb-4">
                    <input
                        className="form-check-input"
                        type="checkbox"
                        id="allowMultiple"
                        checked={allowMultiple}
                        onChange={e => setAllowMultiple(e.target.checked)}
                    />
                    <label className="form-check-label" htmlFor="allowMultiple">
                        Allow multiple answers
                    </label>
                </div>

                <div className="d-flex justify-content-end gap-2">
                    <button className="btn btn-light" onClick={onClose}>Cancel</button>
                    <button className="btn btn-primary" onClick={handleSubmit}>Create Poll</button>
                </div>
            </div>
        </div>
    );
};

export default PollModal;
