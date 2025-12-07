import React, { useRef, useState, useEffect } from 'react';
import { FaTimes, FaPlay, FaPause, FaVolumeUp, FaVolumeMute, FaExpand } from 'react-icons/fa';

const VideoModal = ({ show, onClose, videoUrl }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (show && videoRef.current) {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(e => console.log("Autoplay prevented", e));
        } else {
             setIsPlaying(false);
             setProgress(0);
        }
    }, [show]);

    if (!show || !videoUrl) return null;

    const togglePlay = () => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            if (duration) setProgress((current / duration) * 100);
        }
    };

    const handleSeek = (e) => {
        if (videoRef.current) {
            const manualChange = Number(e.target.value);
            videoRef.current.currentTime = (videoRef.current.duration / 100) * manualChange;
            setProgress(manualChange);
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const toggleFullscreen = () => {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            }
        }
    };

    return (
        <div className="modal show d-block" tabIndex="-1" style={{ backgroundColor: 'rgba(0,0,0,0.9)', zIndex: 1055 }}>
            <div className="modal-dialog modal-fullscreen">
                <div className="modal-content bg-transparent border-0 h-100">
                    {/* Close Button */}
                    <div className="position-absolute top-0 end-0 p-3 z-3">
                        <button className="btn btn-link text-white fs-2" onClick={onClose}>
                            <FaTimes />
                        </button>
                    </div>

                    <div className="modal-body d-flex align-items-center justify-content-center h-100 w-100 p-0 position-relative">
                        <div className="position-relative" style={{ maxWidth: '90%', width: '800px' }}>
                             {/* Video */}
                             <video
                                ref={videoRef}
                                src={videoUrl}
                                className="w-100 rounded"
                                onTimeUpdate={handleTimeUpdate}
                                onEnded={() => setIsPlaying(false)}
                                onClick={togglePlay}
                                style={{ cursor: 'pointer' }}
                             />

                             {/* Custom Controls Bar */}
                             <div className="position-absolute bottom-0 start-0 end-0 p-3"
                                  style={{ background: 'linear-gradient(to top, rgba(0,0,0,0.7), transparent)' }}>

                                 {/* Progress Bar */}
                                 <input
                                    type="range"
                                    className="form-range mb-2"
                                    min="0" max="100"
                                    value={progress}
                                    onChange={handleSeek}
                                    style={{ cursor: 'pointer' }}
                                 />

                                 <div className="d-flex align-items-center justify-content-between text-white">
                                     <div className="d-flex align-items-center gap-3">
                                         <button className="btn btn-link text-white p-0" onClick={togglePlay}>
                                             {isPlaying ? <FaPause size={20} /> : <FaPlay size={20} />}
                                         </button>
                                         <button className="btn btn-link text-white p-0" onClick={toggleMute}>
                                             {isMuted ? <FaVolumeMute size={20} /> : <FaVolumeUp size={20} />}
                                         </button>
                                     </div>
                                     <button className="btn btn-link text-white p-0" onClick={toggleFullscreen}>
                                         <FaExpand size={20} />
                                     </button>
                                 </div>
                             </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoModal;
