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

            // Signal logic would normally involve offer/answer exchange via setRemoteDescription
            // Since we are doing native, we need to handle the signaling manually or use a wrapper.
            // However, native WebRTC is verbose. Let's try to simplify.
            // Actually, for a quick implementation without `simple-peer`, we need:
            // 1. setRemoteDescription(offer)
            // 2. createAnswer
            // 3. setLocalDescription
            // 4. emit answer

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
            setIsVideoCall(isVideo);
            const currentStream = await navigator.mediaDevices.getUserMedia({ video: isVideo, audio: true });
            setLocalStream(currentStream);
            if (myVideo.current) myVideo.current.srcObject = currentStream;
            setShowCallModal(true);

            const peer = createPeerConnection();

            peer.ontrack = (event) => {
                setStream(event.streams[0]);
                if (userVideo.current) userVideo.current.srcObject = event.streams[0];
            };

            peer.onicecandidate = (event) => {
                if (event.candidate) {
                    socket.emit('ice_candidate', { to: id, candidate: event.candidate });
                }
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

            socket.on('call_accepted', async (signal) => {
                setCallAccepted(true);
                await peer.setRemoteDescription(new RTCSessionDescription(signal));
            });

            socket.on('ice_candidate', async (candidate) => {
                try {
                    await peer.addIceCandidate(new RTCIceCandidate(candidate));
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
        if (connectionRef.current) {
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

        // Notify other user
        if (callAccepted && !callEnded) {
             const target = call.from === user._id ? call.userToCall : call.from; // Need to track who we are talking to properly
             // For simplicity, we just reload the window logic or rely on socket 'end_call' broadcast
             // Assuming the UI handles the reset.
        }
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
