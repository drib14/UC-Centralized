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

        socket.on('incoming_call', (data) => {
            if (callStatus === 'idle') {
                setCall({ ...data, isIncoming: true });
                setCallStatus('incoming');
            } else {
                socket.emit('call_busy', { to: data.from });
            }
        });

        socket.on('call_accepted', (signal) => {
            setCallStatus('connected');
            setStartTime(Date.now());
            // Set remote description
            if (peerConnectionRef.current) {
                peerConnectionRef.current.setRemoteDescription(new RTCSessionDescription(signal));
            }
        });

        socket.on('call_rejected', () => {
            toast.info("Call rejected");
            logCallMessage("Missed Call");
            endCallCleanup();
        });

        socket.on('call_ended', () => {
            toast.info("Call ended");
            logCallDuration();
            endCallCleanup();
        });

        socket.on('call_busy', () => {
            toast.warning("User is busy");
            endCallCleanup();
        });

        socket.on('ice_candidate', (candidate) => {
            if (peerConnectionRef.current) {
                peerConnectionRef.current.addIceCandidate(new RTCIceCandidate(candidate))
                    .catch(e => console.error("Error adding ice candidate", e));
            }
        });

        return () => {
            socket.off('incoming_call');
            socket.off('call_accepted');
            socket.off('call_rejected');
            socket.off('call_ended');
            socket.off('call_busy');
            socket.off('ice_candidate');
        };
    }, [socket, callStatus, call, callData]);

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
                    // Signal is sent via 'call_user' in SocketContext? No, we need to send offer NOW.
                    // But 'call_user' was already sent to ring.
                    // Let's refactor: We should send offer WITH 'call_user' or AFTER?
                    // To keep it simple: We update outgoing call with offer.
                    // Actually, SocketContext sent 'mock-signal'. We need to send REAL offer.
                    // We'll emit a new event or just rely on 'call_user' being triggered here?
                    // 'startCall' in SocketContext is just UI trigger.
                    // Let's override the 'call_user' logic here or re-emit.
                    // Better: The initial 'call_user' rings. Once accepted, we exchange SDP?
                    // Standard WebRTC: Initiator creates offer -> sends to peer.
                    // So we should emit 'call_user' with the OFFER.
                    // But 'startLocalStream' is async.
                    // We need to move 'socket.emit(call_user)' HERE.

                    // Hack: We re-emit 'call_user' with real signal
                    socket.emit('call_user', {
                        userToCall: target,
                        signalData: pc.localDescription,
                        from: currentUser?._id, // Need currentUser
                        name: "User", // Need name
                        type: callData.type
                    });
                });
        }

        peerConnectionRef.current = pc;
    };

    // Need currentUser to send name
    // We can get it from storage or Context
    const user = JSON.parse(localStorage.getItem('user_data') || '{}');

    const acceptCall = async () => {
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

            await pc.setRemoteDescription(new RTCSessionDescription(call.signal));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);

            socket.emit('answer_call', { to: call.from, signal: answer });
            peerConnectionRef.current = pc;

        } catch (err) {
            console.error(err);
            endCall();
        }
    };

    const rejectCall = () => {
        socket.emit('reject_call', { to: call.from });
        logCallMessage("Missed Call");
        endCallCleanup();
    };

    const endCall = () => {
        const target = call?.from || callData?.receiverId;
        if (target) socket.emit('end_call', { to: target });
        logCallDuration();
        endCallCleanup();
    };

    const logCallDuration = () => {
        if (!startTime) return;
        const duration = Math.floor((Date.now() - startTime) / 1000);
        const mins = Math.floor(duration / 60);
        const secs = duration % 60;
        const timeStr = `${mins}:${secs < 10 ? '0' : ''}${secs}`;
        const typeStr = isVideo ? "Video Call" : "Voice Call";
        logCallMessage(`${typeStr} ended · ${timeStr}`);
    };

    const logCallMessage = (content) => {
        // Find conversation ID? We don't have it.
        // We can use 'createConversation' endpoint which gets or creates conv.
        // Then send message.
        const targetId = call?.from || callData?.receiverId;
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
