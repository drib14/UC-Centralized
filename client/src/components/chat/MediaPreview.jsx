import React, { useState } from 'react';
import { FaTrash, FaPlus, FaImage } from 'react-icons/fa6';

const MediaPreview = ({ files, onRemove, onAddMore }) => {
    if (!files || files.length === 0) return null;

    return (
        <div className="border-top bg-light p-2">
            <div className="d-flex align-items-center gap-2 overflow-auto pb-2" style={{ scrollbarWidth: 'thin' }}>
                <div
                    className="flex-shrink-0 d-flex align-items-center justify-content-center bg-white border rounded-3 cursor-pointer hover-scale"
                    style={{ width: 100, height: 100 }}
                    onClick={onAddMore}
                >
                    <div className="text-center text-primary">
                        <FaPlus size={24} />
                        <div className="small mt-1">Add</div>
                    </div>
                </div>

                {files.map((file, idx) => {
                    const isImage = file.type.startsWith('image');
                    const isVideo = file.type.startsWith('video');
                    const url = URL.createObjectURL(file);

                    return (
                        <div key={idx} className="position-relative flex-shrink-0" style={{ width: 100, height: 100 }}>
                            {isImage ? (
                                <img src={url} alt="preview" className="w-100 h-100 object-fit-cover rounded-3 border" />
                            ) : isVideo ? (
                                <video src={url} className="w-100 h-100 object-fit-cover rounded-3 border" />
                            ) : (
                                <div className="w-100 h-100 d-flex flex-column align-items-center justify-content-center bg-white border rounded-3 text-muted">
                                    <FaImage size={24} />
                                    <div className="small text-truncate w-75 text-center">{file.name}</div>
                                </div>
                            )}

                            <button
                                className="position-absolute top-0 end-0 btn btn-danger btn-sm rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm"
                                style={{ width: 20, height: 20, transform: 'translate(30%, -30%)' }}
                                onClick={() => onRemove(idx)}
                            >
                                <FaTrash size={10} />
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default MediaPreview;
