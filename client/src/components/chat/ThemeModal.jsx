import React from 'react';
import { FaXmark } from 'react-icons/fa6';

const ThemeModal = ({ show, onClose, onSelect, currentTheme }) => {
    if (!show) return null;

    const themes = [
        '#003399', // UC Blue
        '#FFCC00', // UC Yellow
        '#0084ff', // Messenger Blue
        '#44bec7', // Teal
        '#ffc300', // Amber
        '#fa3c4c', // Red
        '#d696bb', // Pink
        '#6699cc', // Light Blue
        '#13cf13', // Green
        '#ff7e29', // Orange
        '#e68585', // Salmon
        '#7646ff', // Purple
        'linear-gradient(135deg, #00C6FF 0%, #0072FF 100%)',
        'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
        'linear-gradient(135deg, #5ee7df 0%, #b490ca 100%)',
        'linear-gradient(135deg, #89f7fe 0%, #66a6ff 100%)'
    ];

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center z-3" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
            <div className="bg-white rounded-4 shadow p-3 w-100" style={{ maxWidth: '350px' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                    <h6 className="mb-0 fw-bold">Color</h6>
                    <button className="btn btn-sm btn-light rounded-circle" onClick={onClose}><FaXmark /></button>
                </div>
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                    {themes.map((t, i) => (
                        <div
                            key={i}
                            className="rounded-circle cursor-pointer border border-2 d-flex align-items-center justify-content-center"
                            style={{
                                width: 50, height: 50,
                                background: t,
                                borderColor: currentTheme === t ? '#000' : 'transparent'
                            }}
                            onClick={() => { onSelect(t); onClose(); }}
                        >
                            {currentTheme === t && <div className="bg-white rounded-circle" style={{width: 10, height: 10}}></div>}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default ThemeModal;
