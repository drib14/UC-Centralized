import React, { useState, useRef, useEffect } from 'react';
import { FaPaperPlane, FaPaperclip, FaMicrophone, FaStop } from 'react-icons/fa6';
import { toast } from 'react-toastify';

const MessageInput = ({ onSendMessage }) => {
    const [text, setText] = useState("");
    const [isRecording, setIsRecording] = useState(false);
    const [recordingTime, setRecordingTime] = useState(0);
    const mediaRecorderRef = useRef(null);
    const audioChunksRef = useRef([]);
    const fileInputRef = useRef(null);
    const timerRef = useRef(null);

    const handleSend = () => {
        if (!text.trim()) return;
        onSendMessage(text, 'text');
        setText("");
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            onSendMessage("", 'file', file);
            e.target.value = null; // Reset
        }
    };

    // --- AUDIO RECORDING ---
    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            audioChunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                audioChunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' }); // or audio/webm
                const audioFile = new File([audioBlob], "voice_note.wav", { type: 'audio/wav' });
                onSendMessage("", 'audio', audioFile);

                // Cleanup
                stream.getTracks().forEach(track => track.stop());
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);

            // Timer
            setRecordingTime(0);
            timerRef.current = setInterval(() => {
                setRecordingTime(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error(err);
            toast.error("Microphone access denied");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            clearInterval(timerRef.current);
        }
    };

    const formatTime = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m}:${s < 10 ? '0' : ''}${s}`;
    };

    return (
        <div className="p-3 bg-white border-top">
            {isRecording ? (
                 <div className="d-flex align-items-center justify-content-between p-2 bg-light rounded shadow-sm border border-danger">
                     <div className="d-flex align-items-center gap-2 text-danger fw-bold animate-pulse-red">
                         <div className="spinner-grow spinner-grow-sm text-danger" role="status"></div>
                         Recording {formatTime(recordingTime)}
                     </div>
                     <button className="btn btn-danger btn-sm rounded-pill px-4" onClick={stopRecording}>
                         <FaStop className="me-2" /> Stop & Send
                     </button>
                 </div>
            ) : (
                <div className="d-flex align-items-center gap-2">
                    <button className="btn btn-light text-secondary rounded-circle" onClick={() => fileInputRef.current.click()}>
                        <FaPaperclip />
                    </button>
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        onChange={handleFileChange}
                    />

                    <textarea
                        className="form-control rounded-4 border-0 bg-light shadow-none"
                        rows="1"
                        placeholder="Type a message..."
                        style={{ resize: 'none' }}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        onKeyDown={handleKeyDown}
                    ></textarea>

                    {text.trim() ? (
                        <button className="btn btn-primary rounded-circle shadow-sm" onClick={handleSend}>
                            <FaPaperPlane />
                        </button>
                    ) : (
                        <button className="btn btn-light text-danger rounded-circle" onClick={startRecording}>
                            <FaMicrophone />
                        </button>
                    )}
                </div>
            )}
        </div>
    );
};

export default MessageInput;
