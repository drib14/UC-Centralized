import React, { createContext, useState, useRef, useEffect, useContext } from 'react';
import { useSocket } from './SocketContext';
import { useAuth } from './AuthContext';

const CallContext = createContext();

export const useCall = () => useContext(CallContext);

export const CallProvider = ({ children }) => {
    const { socket } = useSocket();
    const { user } = useAuth();

    // Call State
    const [call, setCall] = useState({}); // { isReceivingCall, from, name, signal, isVideo }
    const [callAccepted, setCallAccepted] = useState(false);
    const [callEnded, setCallEnded] = useState(false);
    const [name, setName] = useState('');
    const [stream, setStream] = useState(null);
    const [localStream, setLocalStream] = useState(null);
    const [isVideoCall, setIsVideoCall] = useState(false);
    const [showCallModal, setShowCallModal] = useState(false);

    // Track who we called to handle timeouts/missed calls
    const [outgoingCallTarget, setOutgoingCallTarget] = useState(null);
    const callTimeoutRef = useRef(null);

    const myVideo = useRef();
    const userVideo = useRef();
    const connectionRef = useRef();

    useEffect(() => {
        if (socket) {
            socket.on('call_user', ({ from, name: callerName, signal, isVideo }) => {
                setCall({ isReceivingCall: true, from, name: callerName, signal, isVideo });
                setShowCallModal(true);
            });

            socket.on('call_ended', () => {
                leaveCall();
            });
        }
    }, [socket]);

    const answerCall = async () => {
        setCallAccepted(true);
        setIsVideoCall(call.isVideo);

        try {
            const currentStream = await navigator.mediaDevices.getUserMedia({ video: call.isVideo, audio: true });
            setLocalStream(currentStream);

            // Assign to ref immediately
            if (myVideo.current) myVideo.current.srcObject = currentStream;

            const peer = createPeerConnection();

            peer.ontrack = (event) => {
                setStream(event.streams[0]);
                if (userVideo.current) userVideo.current.srcObject = event.streams[0];
            };

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice_candidate', { to: call.from, candidate: event.candidate });
                }
            };

            await peer.setRemoteDescription(new RTCSessionDescription(call.signal));
            const answer = await peer.createAnswer();
            await peer.setLocalDescription(answer);

            socket.emit('answer_call', { signal: answer, to: call.from });

            connectionRef.current = peer;

            // Handle incoming ICE candidates
            socket.on('ice_candidate', async (candidate) => {
                try {
                    await peer.addIceCandidate(new RTCIceCandidate(candidate));
                } catch (e) {
                    console.error("Error adding ice candidate", e);
                }
            });

            // Add local tracks
            currentStream.getTracks().forEach(track => peer.addTrack(track, currentStream));

        } catch (err) {
            console.error("Failed to answer call", err);
        }
    };

    const callUser = async (id, isVideo) => {
        try {
            setOutgoingCallTarget(id);
            setIsVideoCall(isVideo);
            const currentStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            setLocalStream(currentStream);

            // Assign to ref immediately
            if (myVideo.current) myVideo.current.srcObject = currentStream;

            setShowCallModal(true);

            const peer = createPeerConnection();
            const iceCandidateQueue = [];

            // Store candidates until remote description is set to avoid "No remoteDescription" error
            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice_candidate', { to: id, candidate: event.candidate });
                }
            };

            peer.ontrack = (event) => {
                setStream(event.streams[0]);
                if (userVideo.current) userVideo.current.srcObject = event.streams[0];
            };

            connectionRef.current = peer;

            // Add local tracks
            currentStream.getTracks().forEach(track => peer.addTrack(track, currentStream));

            // Create Offer
            const offer = await peer.createOffer();
            await peer.setLocalDescription(offer);

            socket.emit('call_user', {
                userToCall: id,
                signalData: offer,
                from: user._id,
                name: user.firstName,
                isVideo
            });

            // Start Missed Call Timeout (e.g., 30s)
            callTimeoutRef.current = setTimeout(() => {
                if (!callAccepted) {
                    socket.emit('call_missed', { from: user._id, to: id });
                    leaveCall();
                }
            }, 30000);

            socket.on('call_accepted', async (signal) => {
                setCallAccepted(true);
                clearTimeout(callTimeoutRef.current);
                await peer.setRemoteDescription(new RTCSessionDescription(signal));

                // Process queued candidates
                while (iceCandidateQueue.length > 0) {
                    const candidate = iceCandidateQueue.shift();
                    try {
                        await peer.addIceCandidate(new RTCIceCandidate(candidate));
                    } catch (e) {
                        console.error("Error adding queued ice candidate", e);
                    }
                }
            });

            socket.on('ice_candidate', async (candidate) => {
                try {
                    if (peer.remoteDescription) {
                        await peer.addIceCandidate(new RTCIceCandidate(candidate));
                    } else {
                        iceCandidateQueue.push(candidate);
                    }
                } catch (e) {
                    console.error("Error adding ice candidate", e);
                }
            });

        } catch (err) {
            console.error("Failed to start call", err);
            setShowCallModal(false);
        }
    };

    const leaveCall = () => {
        setCallEnded(true);
        if (callTimeoutRef.current) clearTimeout(callTimeoutRef.current);

        if (connectionRef.current) {
            const target = call.from || outgoingCallTarget;
            if (target) {
                socket.emit('end_call', { to: target, from: user._id });
            }
            connectionRef.current.close();
        }

        if (localStream) {
            localStream.getTracks().forEach(track => track.stop());
        }
        setLocalStream(null);
        setStream(null);
        setShowCallModal(false);
        setCall({});
        setCallAccepted(false);
        setOutgoingCallTarget(null);
    };

    const createPeerConnection = () => {
        const config = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' } // Google STUN
            ]
        };
        return new RTCPeerConnection(config);
    };

    return (
        <CallContext.Provider value={{
            call,
            callAccepted,
            myVideo,
            userVideo,
            stream,
            name,
            setName,
            callEnded,
            leaveCall,
            callUser,
            answerCall,
            showCallModal,
            setShowCallModal,
            localStream,
            isVideoCall
        }}>
            {children}
        </CallContext.Provider>
    );
};
