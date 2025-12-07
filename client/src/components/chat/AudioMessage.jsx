import React, { useRef, useEffect } from 'react';
import { FaPlay, FaPause } from 'react-icons/fa6';

const AudioMessage = ({ src }) => {
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [progress, setProgress] = React.useState(0);
    const [duration, setDuration] = React.useState(0);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play();
        }
        setIsPlaying(!isPlaying);
    };

    const handleTimeUpdate = () => {
        const current = audioRef.current.currentTime;
        const dur = audioRef.current.duration;
        setProgress((current / dur) * 100);
    };

    const handleLoadedMetadata = () => {
        setDuration(audioRef.current.duration);
    };

    const handleEnded = () => {
        setIsPlaying(false);
        setProgress(0);
    };

    const formatTime = (time) => {
        if (!time) return "0:00";
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
    };

    return (
        <div className="d-flex align-items-center gap-2 p-2 rounded bg-light" style={{ minWidth: '200px' }}>
            <button className="btn btn-sm btn-primary rounded-circle p-2" onClick={togglePlay}>
                {isPlaying ? <FaPause /> : <FaPlay />}
            </button>
            <div className="flex-grow-1">
                <div className="progress" style={{ height: '4px', cursor: 'pointer' }}>
                    <div
                        className="progress-bar"
                        role="progressbar"
                        style={{ width: `${progress}%` }}
                    ></div>
                </div>
                <div className="d-flex justify-content-between mt-1" style={{ fontSize: '0.7rem', color: '#666' }}>
                    <span>{formatTime(audioRef.current?.currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                </div>
            </div>
            <audio
                ref={audioRef}
                src={src}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={handleEnded}
                className="d-none"
            />
        </div>
    );
};

export default AudioMessage;
