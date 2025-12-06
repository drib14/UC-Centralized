import React, { useEffect, useRef } from 'react';
import { useCall } from '../../context/CallContext';
import { FaPhoneSlash, FaVideo, FaMicrophone, FaMicrophoneSlash, FaVideoSlash } from 'react-icons/fa';

const CallOverlay = () => {
    const {
        call, callAccepted, myVideo, userVideo, stream, name, callEnded, leaveCall, answerCall, showCallModal, setShowCallModal, isVideoCall
    } = useCall();

    const [micOn, setMicOn] = React.useState(true);
    const [camOn, setCamOn] = React.useState(true);

    if (!showCallModal && !call.isReceivingCall) return null;

    const toggleMic = () => {
        if(stream) {
            stream.getAudioTracks().forEach(track => track.enabled = !micOn);
            setMicOn(!micOn);
        }
    };

    const toggleCam = () => {
        if(stream) {
            stream.getVideoTracks().forEach(track => track.enabled = !camOn);
            setCamOn(!camOn);
        }
    };

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 bg-black bg-opacity-90 z-3 d-flex flex-column align-items-center justify-content-center text-white" style={{zIndex: 9999}}>

            {/* Incoming Call UI */}
            {call.isReceivingCall && !callAccepted && (
                <div className="text-center animate-pulse">
                    <h2 className="mb-4">{call.name || 'Someone'} is calling...</h2>
                    <div className="d-flex gap-4 justify-content-center">
                        <button className="btn btn-success btn-lg rounded-circle p-4" onClick={answerCall}>
                            <FaVideo size={32} />
                        </button>
                        <button className="btn btn-danger btn-lg rounded-circle p-4" onClick={leaveCall}>
                            <FaPhoneSlash size={32} />
                        </button>
                    </div>
                </div>
            )}

            {/* Active Call UI */}
            {callAccepted && !callEnded && (
                <div className="w-100 h-100 position-relative d-flex flex-column">
                    {/* Remote Video (Full Screen) */}
                    <div className="flex-grow-1 position-relative overflow-hidden bg-dark">
                        <video playsInline ref={userVideo} autoPlay className="w-100 h-100 object-fit-cover" />
                        {!userVideo.current?.srcObject && <div className="position-absolute top-50 start-50 translate-middle text-muted">Connecting...</div>}
                    </div>

                    {/* Local Video (Floating Pip) */}
                    {isVideoCall && (
                        <div className="position-absolute top-0 end-0 m-3 rounded-3 overflow-hidden shadow-lg border border-white" style={{width: 150, height: 200}}>
                            <video playsInline muted ref={myVideo} autoPlay className="w-100 h-100 object-fit-cover" style={{transform: 'scaleX(-1)'}} />
                        </div>
                    )}

                    {/* Controls */}
                    <div className="position-absolute bottom-0 start-0 w-100 p-4 d-flex justify-content-center gap-3 bg-gradient-to-t from-black">
                        <button className={`btn btn-lg rounded-circle ${micOn ? 'btn-light' : 'btn-secondary'}`} onClick={toggleMic}>
                            {micOn ? <FaMicrophone /> : <FaMicrophoneSlash />}
                        </button>
                        <button className="btn btn-danger btn-lg rounded-circle px-4" onClick={leaveCall}>
                            <FaPhoneSlash size={24} />
                        </button>
                        {isVideoCall && (
                            <button className={`btn btn-lg rounded-circle ${camOn ? 'btn-light' : 'btn-secondary'}`} onClick={toggleCam}>
                                {camOn ? <FaVideo /> : <FaVideoSlash />}
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CallOverlay;
