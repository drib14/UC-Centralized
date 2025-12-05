import React, { useState, useEffect } from 'react';
import { FaPhone, FaVideo, FaPhoneSlash, FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa6';
import { useSocket } from '../../context/SocketContext';
import { toast } from 'react-toastify';

const CallModal = () => {
    const { socket, callData, setCallData } = useSocket();
    const [call, setCall] = useState(null);
    const [callStatus, setCallStatus] = useState('idle');
    const [isMuted, setIsMuted] = useState(false);

    // WebRTC State
    const [localStream, setLocalStream] = useState(null);
    const [remoteStream, setRemoteStream] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const peerConnectionRef = React.useRef(null);
    const localVideoRef = React.useRef(null);
    const remoteVideoRef = React.useRef(null);

    // Refs for stable access in socket listeners
    const callStatusRef = React.useRef(callStatus);
    const callRef = React.useRef(call);
    const callDataRef = React.useRef(callData);

    useEffect(() => {
        callStatusRef.current = callStatus;
        callRef.current = call;
        callDataRef.current = callData;
    }, [callStatus, call, callData]);

    const isVideo = call?.type === 'video' || callData?.type === 'video';

    // Cleanup tracks on unmount or idle
    useEffect(() => {
        if (callStatus === 'idle') {
            if (localStream) {
                localStream.getTracks().forEach(track => track.stop());
                setLocalStream(null);
            }
            setRemoteStream(null);
            if (peerConnectionRef.current) {
                peerConnectionRef.current.close();
                peerConnectionRef.current = null;
            }
        }
    }, [callStatus]);

    useEffect(() => {
        if (!socket) return;

        const handleIncoming = (data) => {
            if (callStatusRef.current === 'idle') {
                setCall({ ...data, isIncoming: true });
                setCallStatus('incoming');
            } else {
                socket.emit('call_busy', { to: data.from });
            }
        };

        const handleAccepted = (signal) => {
            setCallStatus('connected');
            setStartTime(Date.now());
            if (peerConnectionRef.current) {
                peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
            }
        };

        const handleRejected = () => {
            toast.info("Call rejected");
            const target = callRef.current?.from || callDataRef.current?.receiverId;
            logCallMessage("Missed Call", target);
            endCallCleanup();
        };

        const handleEnded = () => {
            toast.info("Call ended");
            const target = callRef.current?.from || callDataRef.current?.receiverId;
            // Use current start time for duration logic
            logCallDuration(target);
            endCallCleanup();
        };

        const handleBusy = () => {
            toast.warning("User is busy");
            endCallCleanup();
        };

        const handleIce = (candidate) => {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error("Error adding ice candidate", e));
            }
        };

        socket.on('incoming_call', handleIncoming);
        socket.on('call_accepted', handleAccepted);
        socket.on('call_rejected', handleRejected);
        socket.on('call_ended', handleEnded);
        socket.on('call_busy', handleBusy);
        socket.on('ice_candidate', handleIce);

        return () => {
            socket.off('incoming_call', handleIncoming);
            socket.off('call_accepted', handleAccepted);
            socket.off('call_rejected', handleRejected);
            socket.off('call_ended', handleEnded);
            socket.off('call_busy', handleBusy);
            socket.off('ice_candidate', handleIce);
        };
    }, [socket]); // Only depend on socket

    useEffect(() => {
        if (callData && callStatus === 'idle') {
            setCallStatus('outgoing');
            startLocalStream(callData.type);
        }
    }, [callData]);

    const startLocalStream = async (type) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: type === 'video',
                audio: true
            });
            setLocalStream(stream);
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = stream;
            }

            if (callStatus === 'outgoing') {
                createPeerConnection(stream, true); // Initiator
            }
        } catch (err) {
            console.error("Failed to get local stream", err);
            toast.error("Could not access camera/microphone");
            endCallCleanup();
        }
    };

    const createPeerConnection = (stream, isInitiator) => {
        const pc = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:global.stun.twilio.com:3478' }
            ]
        });

        stream.getTracks().forEach(track => pc.addTrack(track, stream));

        pc.ontrack = (event) => {
            setRemoteStream(event.streams[0]);
            if (remoteVideoRef.current) {
                remoteVideoRef.current.srcObject = event.streams[0];
            }
        };

        pc.onicecandidate = (event) => {
            if (event.candidate) {
                const target = call?.from || callData?.receiverId;
                socket.emit('ice_candidate', { to: target, candidate: event.candidate });
            }
        };

        if (isInitiator) {
            pc.createOffer()
                .then(offer => pc.setLocalDescription(offer))
                .then(() => {
                    const target = callData?.receiverId;
                    const signal = {
                        type: pc.localDescription.type,
                        sdp: pc.localDescription.sdp
                    };

                    socket.emit('call_user', {
                        userToCall: target,
                        signalData: signal,
                        from: user?._id,
                        name: `${user?.firstName} ${user?.lastName}`,
                        type: callData.type
                    });
                });
        }

        peerConnectionRef.current = pc;
    };

    // Need currentUser to send name
    // We can get it from storage or Context
    const user = JSON.parse(localStorage.getItem('user_details') || localStorage.getItem('user_data') || '{}');

    const acceptCall = async () => {
        if (!call || !call.signal) {
            console.error("No call signal found");
            return;
        }

        setCallStatus('connected');
        setStartTime(Date.now());

        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: call.type === 'video',
                audio: true
            });
            setLocalStream(stream);
            if (localVideoRef.current) localVideoRef.current.srcObject = stream;

            const pc = new RTCPeerConnection({
                iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
            });

            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            pc.ontrack = (event) => {
                setRemoteStream(event.streams[0]);
                if (remoteVideoRef.current) remoteVideoRef.current.srcObject = event.streams[0];
            };

            pc.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice_candidate', { to: call.from, candidate: event.candidate });
                }
            };

            // Fix: Ensure we are passing a valid object to RTCSessionDescription
            await pc.setRemoteDescription(new RTCSessionDescription(call.signal));

            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            const answerSignal = {
                type: answer.type,
                sdp: answer.sdp
            };

            socket.emit('answer_call', { to: call.from, signal: answerSignal });
            peerConnectionRef.current = pc;

        } catch (err) {
            console.error("Accept Call Error:", err);
            endCall();
        }
    };

    const rejectCall = () => {
        socket.emit('reject_call', { to: call.from });
        const target = call?.from || callData?.receiverId;
        logCallMessage("Missed Call", target);
        endCallCleanup();
    };

    const endCall = () => {
        const target = call?.from || callData?.receiverId;
        if (target) socket.emit('end_call', { to: target });
        logCallDuration(target);
        endCallCleanup();
    };

    const logCallDuration = (targetId) => {
        if (!startTime) return;
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        const typeStr = isVideo ? "Video Call" : "Voice Call";
        logCallMessage(`${typeStr} ended · ${timeStr}`, targetId);
    };

    const logCallMessage = (content, targetId) => {
        if (!targetId) return;

        import('../../utils/api').then(({ default: API }) => {
            API.createConversation(targetId).then(conv => {
                API.sendMessage(conv._id, content, isVideo ? 'video_call' : 'call').catch(console.error);
            }).catch(console.error);
        });
    };

    const endCallCleanup = () => {
        setCallStatus('idle');
        setCall(null);
        setCallData(null);
        setStartTime(null);
        // Clean streams
        if (localStream) localStream.getTracks().forEach(t => t.stop());
        setLocalStream(null);
        setRemoteStream(null);
        if (peerConnectionRef.current) peerConnectionRef.current.close();
        peerConnectionRef.current = null;
    };

    if (callStatus === 'idle') return null;

    // Determine name to show
    const displayName = call?.name || callData?.receiverName || "Unknown User";

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center" style={{ zIndex: 9999, backgroundColor: 'rgba(0,0,0,0.8)' }}>

            {/* Video Container (Full screen if connected video) */}
            {callStatus === 'connected' && isVideo && (
                <div className="position-absolute w-100 h-100 bg-black">
                    <video ref={remoteVideoRef} autoPlay playsInline className="w-100 h-100" style={{objectFit: 'cover'}} />
                    <div className="position-absolute bottom-0 end-0 m-4 rounded overflow-hidden shadow-lg border border-white" style={{width: '150px', height: '100px', zIndex: 10001}}>
                        <video ref={localVideoRef} autoPlay playsInline muted className="w-100 h-100" style={{objectFit: 'cover'}} />
                    </div>
                </div>
            )}

            {/* UI Overlay / Modal */}
            <div className={`text-white rounded-4 p-5 text-center shadow-lg ${callStatus === 'connected' && isVideo ? 'position-absolute bottom-0 mb-5 bg-transparent' : 'bg-dark'}`} style={{ minWidth: '320px', zIndex: 10000 }}>
                {!(callStatus === 'connected' && isVideo) && (
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
                )}

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

            {/* Hidden Local Video if not full video mode (e.g. voice only but we grabbed stream) */}
            {callStatus === 'connected' && !isVideo && (
                 <video ref={localVideoRef} autoPlay playsInline muted hidden />
            )}
        </div>
    );
};

export default CallModal;
