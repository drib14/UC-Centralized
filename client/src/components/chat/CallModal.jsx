import React, { useState, useEffect } from 'react';
import { FaPhone, FaVideo, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa6';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';

const CallModal = () => {
    const { socket, callData, setCallData } = useSocket();
    const [call, setCall] = useState(null);
    const [callStatus, setCallStatus] = useState('idle');
    const [isMuted, setIsMuted] = useState(false);

    useEffect(() => {
        if (!socket) return;

        socket.on('incoming_call', (data) => {
            if (callStatus === 'idle') {
                setCall({ ...data, isIncoming: true });
                setCallStatus('incoming');
            } else {
                socket.emit('call_busy', { to: data.from });
            }
        });

        socket.on('call_accepted', () => {
            setCallStatus('connected');
        });

        socket.on('call_rejected', () => {
            toast.info("Call rejected");
            endCallCleanup();
        });

        socket.on('call_ended', () => {
            toast.info("Call ended");
            endCallCleanup();
        });

        socket.on('call_busy', () => {
            toast.warning("User is busy");
            endCallCleanup();
        });

        return () => {
            socket.off('incoming_call');
            socket.off('call_accepted');
            socket.off('call_rejected');
            socket.off('call_ended');
            socket.off('call_busy');
        };
    }, [socket, callStatus]);

    useEffect(() => {
        if (callData && callStatus === 'idle') {
            setCallStatus('outgoing');
        }
    }, [callData]);

    const acceptCall = () => {
        setCallStatus('connected');
        socket.emit('answer_call', { to: call.from, signal: 'mock-signal' });
    };

    const rejectCall = () => {
        socket.emit('reject_call', { to: call.from });
        endCallCleanup();
    };

    const endCall = () => {
        const target = call?.from || callData?.receiverId;
        if (target) socket.emit('end_call', { to: target });

        // Send system message
        const duration = "0:00"; // Mock duration for now
        const type = call?.type === 'video' || callData?.type === 'video' ? 'Video Call' : 'Voice Call';

        // Note: We need a way to send message to the conversation.
        // Since CallModal is global, we don't have conversationId easily unless we pass it or fetch it.
        // For simplicity, we will let the backend or ChatWindow handle the message?
        // Actually, CallModal is disconnected from ChatWindow state.

        // Alternative: emit an event 'call_ended_log' to backend, and backend creates the message?
        // That is cleaner.

        // But for this plan, let's update Frontend CallModal to render correct type.
        endCallCleanup();
    };

    const endCallCleanup = () => {
        setCallStatus('idle');
        setCall(null);
        setCallData(null);
    };

    if (callStatus === 'idle') return null;

    // Determine name to show
    const displayName = call?.name || callData?.receiverName || "Unknown User";
    const isVideo = call?.type === 'video' || callData?.type === 'video';

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)' }}>
            <div className="bg-dark text-white rounded-4 p-5 text-center shadow-lg" style={{ minWidth: '320px' }}>
                <div className="mb-4">
                    <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-3 border border-3 border-light" style={{ width: 100, height: 100, fontSize: 40 }}>
                        {displayName[0]}
                    </div>
                    <h3>{displayName}</h3>
                    <div className="d-flex align-items-center justify-content-center gap-2 text-white-50 animate-pulse">
                        {isVideo ? <FaVideo /> : <FaPhone />}
                        <span>
                            {callStatus === 'incoming' ? `Incoming ${isVideo ? 'Video' : 'Voice'} Call...` :
                             callStatus === 'outgoing' ? `Calling ${isVideo ? 'Video' : 'Voice'}...` :
                             'Connected'}
                        </span>
                    </div>
                </div>

                <div className="d-flex gap-4 justify-content-center align-items-center">
                    {callStatus === 'incoming' && (
                        <>
                            <button className="btn btn-success btn-lg rounded-circle p-3 shadow" onClick={acceptCall} title="Accept">
                                <FaPhone />
                            </button>
                            <button className="btn btn-danger btn-lg rounded-circle p-3 shadow" onClick={rejectCall} title="Reject">
                                <FaPhoneSlash />
                            </button>
                        </>
                    )}

                    {callStatus === 'outgoing' && (
                        <button className="btn btn-danger btn-lg rounded-circle p-3 shadow" onClick={endCall}>
                            <FaPhoneSlash />
                        </button>
                    )}

                    {callStatus === 'connected' && (
                        <>
                            <button className={`btn btn-lg rounded-circle p-3 shadow ${isMuted ? 'btn-secondary' : 'btn-light text-dark'}`} onClick={() => setIsMuted(!isMuted)}>
                                {isMuted ? <FaMicrophoneSlash /> : <FaMicrophone />}
                            </button>
                            <button className="btn btn-danger btn-lg rounded-circle p-3 shadow" onClick={endCall}>
                                <FaPhoneSlash />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default CallModal;
