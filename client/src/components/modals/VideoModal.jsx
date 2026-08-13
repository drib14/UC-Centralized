import React, { useRef, useState, useEffect } from 'react';
import {
    FaTimes,
    FaPlay,
    FaPause,
    FaVolumeUp,
    FaVolumeMute,
    FaExpand,
    FaDownload,
    FaVideo
} from 'react-icons/fa';

const formatTime = (seconds) => {
    if (isNaN(seconds) || seconds === null) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

const VideoModal = ({ show, onClose, videoUrl }) => {
    const videoRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isMuted, setIsMuted] = useState(false);
    const [volume, setVolume] = useState(1);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef(null);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape' && show) {
                onClose();
            } else if (e.code === 'Space' && show && e.target.tagName !== 'INPUT') {
                e.preventDefault();
                togglePlay();
            }
        };

        if (show) {
            window.addEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'hidden';
            if (videoRef.current) {
                videoRef.current.play().then(() => setIsPlaying(true)).catch(() => setIsPlaying(false));
            }
        } else {
            setIsPlaying(false);
            setCurrentTime(0);
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            document.body.style.overflow = 'unset';
        };
    }, [show, onClose]);

    if (!show || !videoUrl) return null;

    const fileName = (videoUrl.split('/').pop() || 'video').split('?')[0];

    const togglePlay = () => {
        if (!videoRef.current) return;
        if (isPlaying) {
            videoRef.current.pause();
            setIsPlaying(false);
        } else {
            videoRef.current.play().then(() => setIsPlaying(true)).catch(console.error);
        }
    };

    const handleTimeUpdate = () => {
        if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            if (videoRef.current.duration && !duration) {
                setDuration(videoRef.current.duration);
            }
        }
    };

    const handleLoadedMetadata = () => {
        if (videoRef.current) {
            setDuration(videoRef.current.duration);
        }
    };

    const handleSeek = (e) => {
        if (!videoRef.current || !duration) return;
        const newTime = (Number(e.target.value) / 100) * duration;
        videoRef.current.currentTime = newTime;
        setCurrentTime(newTime);
    };

    const toggleMute = () => {
        if (!videoRef.current) return;
        const nextMuted = !isMuted;
        videoRef.current.muted = nextMuted;
        setIsMuted(nextMuted);
    };

    const handleVolumeChange = (e) => {
        const newVol = Number(e.target.value);
        setVolume(newVol);
        if (videoRef.current) {
            videoRef.current.volume = newVol;
            videoRef.current.muted = newVol === 0;
            setIsMuted(newVol === 0);
        }
    };

    const toggleFullscreen = () => {
        if (!videoRef.current) return;
        if (videoRef.current.requestFullscreen) {
            videoRef.current.requestFullscreen();
        } else if (videoRef.current.webkitRequestFullscreen) {
            videoRef.current.webkitRequestFullscreen();
        }
    };

    const handleMouseMove = () => {
        setShowControls(true);
        if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
        controlsTimeoutRef.current = setTimeout(() => {
            if (isPlaying) setShowControls(false);
        }, 3000);
    };

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div
            className="modal show d-block animate-fade-in"
            tabIndex="-1"
            style={{
                backgroundColor: 'rgba(10, 15, 30, 0.92)',
                backdropFilter: 'blur(14px)',
                WebkitBackdropFilter: 'blur(14px)',
                zIndex: 1060
            }}
            onClick={onClose}
        >
            <div
                className="d-flex flex-column justify-content-between h-100 w-100 p-3 p-md-4"
                onMouseMove={handleMouseMove}
            >
                {/* Top Action Bar */}
                <div
                    className="d-flex align-items-center justify-content-between w-100 mb-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className="d-flex align-items-center text-white gap-2 bg-dark bg-opacity-50 px-2.5 py-1 rounded-pill border border-secondary border-opacity-25 shadow-sm min-w-0">
                        <FaVideo className="text-info flex-shrink-0" size={13} />
                        <span className="small fw-medium text-truncate" style={{ maxWidth: 'min(180px, 42vw)' }}>
                            {fileName}
                        </span>
                    </div>

                    <div className="d-flex align-items-center gap-1.5 flex-shrink-0">
                        <a
                            href={videoUrl}
                            download={fileName}
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-sm btn-dark bg-opacity-50 border border-secondary border-opacity-25 rounded-circle text-white d-flex align-items-center justify-content-center hover-scale shadow-sm p-0"
                            style={{ width: '36px', height: '36px' }}
                            title="Download video"
                        >
                            <FaDownload size={13} />
                        </a>
                        <button
                            type="button"
                            className="btn btn-sm btn-dark bg-opacity-50 border border-secondary border-opacity-25 rounded-circle text-white d-flex align-items-center justify-content-center hover-scale shadow-sm p-0"
                            style={{ width: '36px', height: '36px' }}
                            onClick={onClose}
                            title="Close (Esc)"
                        >
                            <FaTimes size={14} />
                        </button>
                    </div>
                </div>

                {/* Video Area (Dynamic Aspect Ratio & Dynamic Height Adaptation) */}
                <div
                    className="d-flex align-items-center justify-content-center flex-grow-1 overflow-hidden position-relative"
                    onClick={(e) => e.stopPropagation()}
                >
                    <div
                        className="position-relative d-inline-flex align-items-center justify-content-center rounded-3 overflow-hidden shadow-lg"
                        style={{
                            maxWidth: '92vw',
                            maxHeight: '82vh',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.85)'
                        }}
                    >
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="rounded-3"
                            style={{
                                maxWidth: '92vw',
                                maxHeight: '82vh',
                                width: 'auto',
                                height: 'auto',
                                objectFit: 'contain',
                                display: 'block',
                                cursor: 'pointer'
                            }}
                            onTimeUpdate={handleTimeUpdate}
                            onLoadedMetadata={handleLoadedMetadata}
                            onEnded={() => setIsPlaying(false)}
                            onClick={togglePlay}
                            playsInline
                        />

                        {/* Center Big Play Button (when paused) */}
                        {!isPlaying && (
                            <button
                                type="button"
                                className="btn position-absolute top-50 start-50 translate-middle rounded-circle bg-dark bg-opacity-75 text-white d-flex align-items-center justify-content-center shadow-lg hover-scale"
                                style={{ width: '68px', height: '68px', backdropFilter: 'blur(8px)', border: '2px solid rgba(255,255,255,0.2)' }}
                                onClick={togglePlay}
                            >
                                <FaPlay size={26} className="ms-1 text-primary" />
                            </button>
                        )}

                        {/* Floating Bottom Controls Overlay */}
                        <div
                            className={`position-absolute bottom-0 start-0 end-0 p-3 transition-all ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                            style={{
                                background: 'linear-gradient(to top, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.3) 70%, transparent 100%)',
                                transition: 'opacity 0.25s ease'
                            }}
                        >
                            {/* Seek Slider */}
                            <div className="d-flex align-items-center gap-2 mb-2">
                                <input
                                    type="range"
                                    className="form-range custom-video-range"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                    value={progress || 0}
                                    onChange={handleSeek}
                                    style={{
                                        cursor: 'pointer',
                                        accentColor: '#3b82f6',
                                        height: '4px'
                                    }}
                                />
                            </div>

                            <div className="d-flex align-items-center justify-content-between text-white">
                                <div className="d-flex align-items-center gap-3">
                                    <button
                                        type="button"
                                        className="btn btn-link text-white p-0 hover-scale"
                                        onClick={togglePlay}
                                        title={isPlaying ? "Pause (Space)" : "Play (Space)"}
                                    >
                                        {isPlaying ? <FaPause size={18} /> : <FaPlay size={18} />}
                                    </button>

                                    {/* Volume Controls */}
                                    <div className="d-flex align-items-center gap-2">
                                        <button
                                            type="button"
                                            className="btn btn-link text-white p-0 hover-scale"
                                            onClick={toggleMute}
                                            title={isMuted ? "Unmute" : "Mute"}
                                        >
                                            {isMuted || volume === 0 ? <FaVolumeMute size={18} className="text-danger" /> : <FaVolumeUp size={18} />}
                                        </button>
                                        <input
                                            type="range"
                                            className="form-range d-none d-sm-inline-block"
                                            min="0"
                                            max="1"
                                            step="0.05"
                                            value={isMuted ? 0 : volume}
                                            onChange={handleVolumeChange}
                                            style={{ width: '70px', accentColor: '#3b82f6', height: '4px' }}
                                        />
                                    </div>

                                    {/* Time Display */}
                                    <div className="small font-monospace opacity-75" style={{ fontSize: '0.8rem' }}>
                                        {formatTime(currentTime)} / {formatTime(duration)}
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="btn btn-link text-white p-0 hover-scale"
                                    onClick={toggleFullscreen}
                                    title="Fullscreen"
                                >
                                    <FaExpand size={18} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VideoModal;
