import React from 'react';
import { useCall } from '../../context/CallContext';
import { FaPhoneSlash, FaMicrophone, FaMicrophoneSlash, FaVideo, FaVideoSlash } from 'react-icons/fa6';

const CallOverlay = () => {
    const {
        call, callAccepted, myVideo, userVideo, stream, callEnded, leaveCall, answerCall, showCallModal, isVideoCall
    } = useCall();

    if (!showCallModal) return null;

    return (
        <div className="position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-dark" style={{ zIndex: 9999 }}>
            {/* Incoming Call Modal */}
            {!callAccepted && call.isReceivingCall && (
                <div className="text-center text-white">
                    <div className="mb-4">
                        <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-3" style={{width: 100, height: 100, fontSize: '2rem'}}>
                            {call.name ? call.name[0] : 'U'}
                        </div>
                        <h3>{call.name} is calling...</h3>
                        <p>{call.isVideo ? 'Video Call' : 'Voice Call'}</p>
                    </div>
                    <div className="d-flex gap-4 justify-content-center">
                        <button className="btn btn-danger btn-lg rounded-circle p-4" onClick={leaveCall}>
                            <FaPhoneSlash size={24} />
                        </button>
                        <button className="btn btn-success btn-lg rounded-circle p-4" onClick={answerCall}>
                            {call.isVideo ? <FaVideo size={24} /> : <FaMicrophone size={24} />}
                        </button>
                    </div>
                </div>
            )}

            {/* In Call Interface */}
            {callAccepted && !callEnded && (
                <div className="w-100 h-100 position-relative">
                    {/* Remote Video (Full Screen) */}
                    <div className="w-100 h-100 bg-black d-flex align-items-center justify-content-center">
                        {isVideoCall && stream ? (
                            <video playsInline ref={userVideo} autoPlay className="w-100 h-100 object-fit-cover" />
                        ) : (
                            <div className="text-center text-white">
                                <div className="rounded-circle bg-secondary d-flex align-items-center justify-content-center mx-auto mb-3" style={{width: 150, height: 150, fontSize: '3rem'}}>
                                    {call.name ? call.name[0] : 'U'}
                                </div>
                                <h2>{call.name}</h2>
                                <p>Connected</p>
                            </div>
                        )}
                    </div>

                    {/* Local Video (PiP) */}
                    {isVideoCall && (
                        <div className="position-absolute top-0 end-0 m-3 shadow-lg rounded overflow-hidden" style={{width: '120px', height: '160px', zIndex: 2}}>
                            <video playsInline muted ref={myVideo} autoPlay className="w-100 h-100 object-fit-cover" />
                        </div>
                    )}

                    {/* Controls */}
                    <div className="position-absolute bottom-0 start-50 translate-middle-x mb-4 d-flex gap-3 bg-dark bg-opacity-50 p-3 rounded-pill">
                        <button className="btn btn-light rounded-circle p-3"><FaMicrophone /></button>
                        {isVideoCall && <button className="btn btn-light rounded-circle p-3"><FaVideo /></button>}
                        <button className="btn btn-danger rounded-circle p-3 px-4" onClick={leaveCall}><FaPhoneSlash /></button>
                    </div>
                </div>
            )}

            {/* Calling State (Outgoing) */}
            {!callAccepted && !call.isReceivingCall && (
                 <div className="text-center text-white">
                    <div className="mb-4">
                        <div className="spinner-grow text-light" role="status" style={{width: '3rem', height: '3rem'}}></div>
                        <h3 className="mt-3">Calling...</h3>
                    </div>
                    <button className="btn btn-danger btn-lg rounded-circle p-4" onClick={leaveCall}>
                        <FaPhoneSlash size={24} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default CallOverlay;
