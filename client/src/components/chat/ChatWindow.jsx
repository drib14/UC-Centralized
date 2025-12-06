import React, { useState, useEffect, useRef, useCallback } from "react";
import API from "../../utils/api";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";
import { useCall } from "../../context/CallContext";
import UserAvatar from "./UserAvatar";
import PollModal from "./PollModal";
import MediaPreview from "./MediaPreview";
import ChatInfoModal from "./ChatInfoModal";
import StickerPicker from "./StickerPicker";
import EmojiPicker from "emoji-picker-react";
import { toast } from "react-toastify";
import {
  FaPhone,
  FaVideo,
  FaCircleInfo,
  FaImages,
  FaFaceSmile,
  FaPlus,
  FaPaperPlane,
  FaArrowLeft,
  FaPlay,
  FaTrash,
  FaLocationDot,
  FaSquarePollVertical,
  FaMicrophone,
  FaReply,
  FaXmark,
  FaPhoneSlash,
} from "react-icons/fa6";

/**
 * ChatWindow
 * Rewritten: fixes import error (removed FaStickyNote), cleans lifecycle,
 * improves audio handling, file input, optimistic updates, and socket usage.
 */
const ChatWindow = ({ conversationId, onBack }) => {
  const { user } = useAuth();
  const { socket } = useSocket();
  const { callUser } = useCall();

  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [showPollModal, setShowPollModal] = useState(false);
  const [lightboxMedia, setLightboxMedia] = useState(null);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [replyTo, setReplyTo] = useState(null);

  const [selectedFiles, setSelectedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const recordingTimerRef = useRef(null);

  const touchStartRef = useRef(null);
  const touchEndRef = useRef(null);

  const messagesEndRef = useRef(null);
  const audioRefs = useRef({});
  const [playingAudio, setPlayingAudio] = useState(null);

  // --- helpers ---
  const scrollToBottom = useCallback(() => {
    requestAnimationFrame(() =>
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    );
  }, []);

  const getOtherUserId = () => {
    if (!conversation || !user) return null;
    const other = conversation.participants?.find((p) => p._id !== user._id);
    return other?._id ?? null;
  };

  const getOtherUser = () => {
    if (!conversation) return {};
    return (
      conversation.participants?.find((p) => p._id !== user._id) ||
      conversation.participants?.[0] ||
      {}
    );
  };

  // --- load data ---
  useEffect(() => {
    if (!conversationId) return;

    let mounted = true;
    const loadData = async () => {
      try {
        const msgs = await API.get(`/messages/${conversationId}`);
        if (!mounted) return;
        setMessages(Array.isArray(msgs) ? msgs : []);
        scrollToBottom();

        // attempt to fetch conversation meta
        const convs = await API.get("/messages/conversations");
        if (!mounted) return;
        const currentConv = Array.isArray(convs)
          ? convs.find((c) => c._id === conversationId)
          : null;
        if (currentConv) setConversation(currentConv);
        API.markMessagesRead(conversationId).catch(() => {});
      } catch (err) {
        console.error("Load messages error", err);
      }
    };

    loadData();
    return () => {
      mounted = false;
    };
  }, [conversationId, scrollToBottom]);

  // --- socket listeners ---
  useEffect(() => {
    if (!socket || !conversationId) return;

    const handleReceive = (msg) => {
      try {
        const matches =
          msg.conversationId === conversationId ||
          msg.conversationId?._id === conversationId;
        if (!matches) return;
        setMessages((prev) => {
          if (prev.some((m) => m._id === msg._id)) return prev;
          return [...prev, msg];
        });
        scrollToBottom();
      } catch (e) {
        console.error(e);
      }
    };

    const handleUpdate = (msg) => {
      const matches =
        msg.conversationId === conversationId ||
        msg.conversationId?._id === conversationId;
      if (!matches) return;
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? msg : m)));
    };

    const handleSettingsUpdate = (data) => {
      if (data.conversationId === conversationId)
        setConversation((prev) => ({ ...prev, ...data }));
    };

    socket.on("receive_message", handleReceive);
    socket.on("message_updated", handleUpdate);
    socket.on("conversation_settings_updated", handleSettingsUpdate);

    // mark read
    socket.emit("mark_messages_read", {
      conversationId,
      readerId: user?._id,
      senderId: getOtherUserId(),
    });

    return () => {
      socket.off("receive_message", handleReceive);
      socket.off("message_updated", handleUpdate);
      socket.off("conversation_settings_updated", handleSettingsUpdate);
    };
  }, [socket, conversationId, user, scrollToBottom]);

  // --- optimistic send ---
  const handleSend = async (
    content = newMessage,
    type = "text",
    attachments = [],
    pollData = null,
    locationData = null
  ) => {
    if (
      type === "text" &&
      !content.trim() &&
      attachments.length === 0 &&
      !pollData &&
      !locationData
    )
      return;

    const tempId = `tmp_${Date.now()}`;
    const optimisticMsg = {
      _id: tempId,
      conversationId,
      sender: user,
      content,
      type,
      attachments,
      pollData,
      locationData,
      createdAt: new Date().toISOString(),
      isPending: true,
      replyTo,
    };

    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    setReplyTo(null);
    setSelectedFiles([]);
    scrollToBottom();
    setIsSending(true);

    try {
      const res = await API.post("/messages", {
        conversationId,
        content,
        type,
        attachments,
        pollData,
        locationData,
        replyTo: replyTo?._id,
      });

      setMessages((prev) => prev.map((m) => (m._id === tempId ? res : m)));
      socket?.emit("send_message", { ...res, receiverId: getOtherUserId() });
    } catch (err) {
      console.error("Send failed", err);
      toast.error("Failed to send message");
      setMessages((prev) => prev.filter((m) => m._id !== tempId));
    } finally {
      setIsSending(false);
    }
  };

  // --- file upload ---
  const handleFileUpload = async () => {
    if (!selectedFiles.length) return;
    setIsUploading(true);
    try {
      const uploadedAttachments = [];
      for (const f of selectedFiles) {
        const { url } = await API.uploadFile(f);
        let t = "file";
        if (f.type.startsWith("image")) t = "image";
        else if (f.type.startsWith("video")) t = "video";
        else if (f.type.startsWith("audio")) t = "audio";
        uploadedAttachments.push({ url, type: t, name: f.name, size: f.size });
      }
      const primaryType =
        uploadedAttachments[0].type === "image" ? "image" : "file";
      await handleSend(newMessage, primaryType, uploadedAttachments);
    } catch (e) {
      console.error(e);
      toast.error("Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  // --- recording ---
  useEffect(() => {
    return () => {
      clearInterval(recordingTimerRef.current);
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        try {
          mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
        } catch (e) {}
      }
    };
  }, []);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorderRef.current = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mediaRecorderRef.current.ondataavailable = (e) =>
        audioChunksRef.current.push(e.data);
      mediaRecorderRef.current.start();
      setIsRecording(true);
      setRecordingDuration(0);
      recordingTimerRef.current = setInterval(
        () => setRecordingDuration((d) => d + 1),
        1000
      );
    } catch (e) {
      console.error(e);
      toast.error("Microphone access denied");
    }
  };

  const stopRecording = (shouldSend = false) => {
    if (!mediaRecorderRef.current) return;
    mediaRecorderRef.current.onstop = async () => {
      clearInterval(recordingTimerRef.current);
      setIsRecording(false);
      if (shouldSend) {
        try {
          const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
          const file = new File([blob], `voice_${Date.now()}.webm`, {
            type: "audio/webm",
          });
          setIsUploading(true);
          const { url } = await API.uploadFile(file);
          await handleSend("", "audio", [
            { url, type: "audio", duration: recordingDuration },
          ]);
        } catch (e) {
          console.error(e);
          toast.error("Failed to send audio");
        } finally {
          setIsUploading(false);
        }
      }
    };
    mediaRecorderRef.current.stop();
    try {
      mediaRecorderRef.current.stream.getTracks().forEach((t) => t.stop());
    } catch (e) {}
  };

  // --- location ---
  const handleLocation = () => {
    if (!navigator.geolocation) return toast.error("Geolocation not supported");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSend("Shared Location", "location", [], null, {
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
        });
        setShowPlusMenu(false);
      },
      () => toast.error("Unable to get location")
    );
  };

  // --- reactions ---
  const handleReaction = async (msg, emoji) => {
    try {
      setMessages((prev) =>
        prev.map((m) => {
          if (m._id === msg._id) {
            const existingIdx = m.reactions?.findIndex(
              (r) => r.user === user._id || r.user?._id === user._id
            );
            let newReactions = m.reactions ? [...m.reactions] : [];
            if (existingIdx > -1) {
              if (newReactions[existingIdx].emoji === emoji)
                newReactions.splice(existingIdx, 1);
              else newReactions[existingIdx].emoji = emoji;
            } else {
              newReactions.push({ user, emoji });
            }
            return { ...m, reactions: newReactions };
          }
          return m;
        })
      );
      await API.put(`/messages/${msg._id}/react`, { emoji });
    } catch (e) {
      console.error(e);
    }
  };

  // --- swipe handlers ---
  const onTouchStart = (e) => {
    touchEndRef.current = null;
    touchStartRef.current = e.targetTouches?.[0]?.clientX ?? null;
  };
  const onTouchMove = (e) => {
    touchEndRef.current = e.targetTouches?.[0]?.clientX ?? null;
  };
  const onTouchEnd = (msg) => {
    if (touchStartRef.current == null || touchEndRef.current == null) return;
    const distance = touchStartRef.current - touchEndRef.current;
    if (distance < -50) setReplyTo(msg);
  };

  // --- delete message ---
  const handleDeleteMessage = async (msgId) => {
    if (!window.confirm("Unsend for everyone?")) return;
    try {
      await API.delete(`/messages/${msgId}?mode=everyone`);
      setMessages((prev) =>
        prev.map((m) =>
          m._id === msgId
            ? {
                ...m,
                isDeletedForEveryone: true,
                content: "Message unsent",
                attachments: [],
              }
            : m
        )
      );
    } catch (e) {
      console.error(e);
      toast.error("Failed to delete message");
    }
  };

  // --- file input change ---
  const onFilesSelected = (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length) setSelectedFiles((prev) => [...prev, ...files]);
    // reset input so same file can be reselected later
    e.target.value = null;
  };

  // --- audio play/pause helper ---
  const toggleAudio = (url) => {
    const audio = audioRefs.current[url];
    if (!audio) return;
    if (audio.paused) {
      // pause currently playing other audio
      if (playingAudio && playingAudio !== url) {
        audioRefs.current[playingAudio]?.pause();
      }
      audio.play();
      setPlayingAudio(url);
      audio.onended = () => setPlayingAudio(null);
    } else {
      audio.pause();
      setPlayingAudio(null);
    }
  };

  // --- render content helper ---
  const renderContent = (msg, isMe) => {
    if (msg.type === "location" && msg.locationData) {
      return (
        <div
          className="bg-white p-2 rounded-3 cursor-pointer"
          style={{ width: 200 }}
        >
          <a
            href={`https://www.google.com/maps?q=${msg.locationData.latitude},${msg.locationData.longitude}`}
            target="_blank"
            rel="noreferrer"
            className="text-decoration-none text-dark"
          >
            <div
              className="bg-light d-flex align-items-center justify-content-center rounded mb-2"
              style={{ height: 100 }}
            >
              <FaLocationDot size={32} className="text-danger" />
            </div>
            <div className="fw-bold small">Shared Location</div>
          </a>
        </div>
      );
    }

    if (msg.type === "poll" && msg.pollData) {
      return (
        <div
          className="bg-white p-3 rounded-3 shadow-sm cursor-pointer"
          style={{ minWidth: 200 }}
        >
          <div className="fw-bold mb-2">{msg.pollData.question}</div>
          <small className="text-muted d-block mb-2">Tap to vote</small>
          <button
            className="btn btn-sm btn-outline-primary w-100"
            onClick={() => setShowPollModal(true)}
          >
            View Poll
          </button>
        </div>
      );
    }

    return msg.content;
  };

  if (!conversation)
    return (
      <div className="h-100 d-flex align-items-center justify-content-center">
        Loading...
      </div>
    );

  const otherUser = getOtherUser();
  const nickname =
    conversation.nicknames?.[otherUser._id] || otherUser.firstName;
  const themeColor = conversation.theme || "#003399";

  return (
    <div className="d-flex flex-column h-100 bg-white position-relative">
      {/* Header */}
      <div
        className="d-flex align-items-center justify-content-between p-2 border-bottom shadow-sm"
        style={{ height: 60 }}
      >
        <div className="d-flex align-items-center gap-2">
          <button
            className="btn btn-messenger d-md-none text-primary"
            onClick={onBack}
          >
            <FaArrowLeft />
          </button>
          <div
            className="cursor-pointer"
            onClick={() => setShowInfoModal(true)}
          >
            <UserAvatar
              user={otherUser}
              size={40}
              showOnlineStatus
              isOnline={otherUser.isOnline}
            />
          </div>
          <div
            className="cursor-pointer"
            onClick={() => setShowInfoModal(true)}
          >
            <div className="fw-bold lh-1">
              {nickname} {otherUser.lastName}
            </div>
            <small className="text-muted" style={{ fontSize: "0.75rem" }}>
              {otherUser.isOnline ? "Active now" : "Offline"}
            </small>
          </div>
        </div>

        <div className="d-flex gap-3 text-primary me-2">
          <FaPhone
            size={20}
            className="cursor-pointer"
            onClick={() => callUser(otherUser._id, false)}
          />
          <FaVideo
            size={20}
            className="cursor-pointer"
            onClick={() => callUser(otherUser._id, true)}
          />
          <FaCircleInfo
            size={20}
            className="cursor-pointer"
            onClick={() => setShowInfoModal(true)}
          />
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-grow-1 overflow-auto p-3 d-flex flex-column gap-1"
        onClick={() => {
          setShowPlusMenu(false);
          setShowEmojiPicker(false);
          setShowStickerPicker(false);
          setMenuOpenId(null);
        }}
      >
        {messages.map((msg, i) => {
          const isMe = msg.sender?._id === user._id;
          const isContinuous = messages[i + 1]?.sender?._id === msg.sender?._id;

          if (msg.type === "system" || msg.type === "call_log") {
            return (
              <div key={msg._id} className="text-center my-3">
                {msg.type === "call_log" ? (
                  <div className="d-inline-flex align-items-center gap-2 bg-light px-3 py-2 rounded-pill text-secondary border">
                    <FaPhoneSlash /> <span>{msg.content}</span>
                  </div>
                ) : (
                  <small className="text-muted">{msg.content}</small>
                )}
              </div>
            );
          }

          return (
            <div
              key={msg._id}
              className={`d-flex ${
                isMe ? "justify-content-end" : "justify-content-start"
              } mb-1 position-relative group`}
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={() => onTouchEnd(msg)}
              onContextMenu={(e) => {
                e.preventDefault();
                setMenuOpenId(msg._id);
              }}
            >
              {!isMe && (
                <div
                  className="me-2"
                  style={{ width: 28, opacity: isContinuous ? 0 : 1 }}
                >
                  <UserAvatar user={otherUser} size={28} />
                </div>
              )}

              <div className="position-relative" style={{ maxWidth: "75%" }}>
                {msg.replyTo && (
                  <div className="small text-muted mb-1 ms-2 border-start border-2 ps-2">
                    Replying to {msg.replyTo.sender.firstName}:{" "}
                    {msg.replyTo.content || "Attachment"}
                  </div>
                )}

                {msg.isDeletedForEveryone ? (
                  <div className="border px-3 py-2 rounded-3 text-muted fst-italic bg-light">
                    Message unsent
                  </div>
                ) : (
                  <div
                    className={`px-3 py-2 ${
                      msg.type === "text"
                        ? isMe
                          ? "text-white"
                          : "text-dark"
                        : ""
                    }`}
                    style={{
                      backgroundColor:
                        msg.type === "text"
                          ? isMe
                            ? themeColor
                            : "#e4e6eb"
                          : "transparent",
                      borderRadius: "18px",
                      borderBottomRightRadius:
                        isMe && isContinuous ? "4px" : "18px",
                      borderTopRightRadius:
                        isMe && !isContinuous ? "18px" : isMe ? "4px" : "18px",
                      borderBottomLeftRadius:
                        !isMe && isContinuous ? "4px" : "18px",
                      borderTopLeftRadius:
                        !isMe && !isContinuous
                          ? "18px"
                          : !isMe
                          ? "4px"
                          : "18px",
                    }}
                    onDoubleClick={() => handleReaction(msg, "❤️")}
                  >
                    {msg.attachments?.map((att, idx) => (
                      <div key={idx} className="mb-1">
                        {att.type === "image" && (
                          <img
                            src={att.url}
                            className="rounded-3 mw-100 cursor-pointer"
                            onClick={() => setLightboxMedia(att)}
                            alt={att.name || "image"}
                          />
                        )}
                        {att.type === "video" && (
                          <video
                            src={att.url}
                            controls
                            className="rounded-3 mw-100"
                          />
                        )}
                        {att.type === "audio" && (
                          <div
                            className="d-flex align-items-center gap-2 bg-white rounded-pill px-2 py-1 border shadow-sm"
                            style={{ minWidth: 150 }}
                          >
                            <button
                              className="btn btn-sm btn-primary rounded-circle"
                              onClick={() => toggleAudio(att.url)}
                            >
                              <FaPlay size={10} />
                            </button>
                            <audio
                              ref={(el) => (audioRefs.current[att.url] = el)}
                              src={att.url}
                            />
                          </div>
                        )}
                        {att.type === "sticker" && (
                          <img
                            src={att.url}
                            style={{ width: 120 }}
                            alt="sticker"
                          />
                        )}
                      </div>
                    ))}
                    {renderContent(msg, isMe)}
                  </div>
                )}

                {msg.reactions?.length > 0 && (
                  <div
                    className="position-absolute bg-white rounded-pill px-1 shadow-sm border"
                    style={{
                      bottom: -10,
                      [isMe ? "right" : "left"]: 0,
                      fontSize: "0.8rem",
                    }}
                  >
                    {msg.reactions.map((r, idx) => (
                      <span key={idx}>{r.emoji}</span>
                    ))}
                  </div>
                )}
              </div>

              {menuOpenId === msg._id && (
                <div
                  className="position-absolute bg-white shadow rounded p-2 d-flex gap-2 z-3"
                  style={{ top: -40, [isMe ? "right" : "left"]: 0 }}
                >
                  <FaReply
                    className="text-secondary cursor-pointer"
                    onClick={() => {
                      setReplyTo(msg);
                      setMenuOpenId(null);
                    }}
                  />
                  {isMe && (
                    <FaTrash
                      className="text-danger cursor-pointer"
                      onClick={() => handleDeleteMessage(msg._id)}
                    />
                  )}
                </div>
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-2 bg-white border-top">
        {replyTo && (
          <div className="d-flex justify-content-between align-items-center bg-light p-2 rounded mb-2 border-start border-primary border-4">
            <small>Replying to {replyTo.sender.firstName}</small>
            <FaXmark
              className="cursor-pointer"
              onClick={() => setReplyTo(null)}
            />
          </div>
        )}

        <MediaPreview
          files={selectedFiles}
          onRemove={(i) =>
            setSelectedFiles((p) => p.filter((_, idx) => idx !== i))
          }
        />

        <div className="d-flex align-items-center gap-2 position-relative">
          <FaPlus
            className="text-primary cursor-pointer fs-4"
            onClick={() => setShowPlusMenu((s) => !s)}
          />
          {showPlusMenu && (
            <div
              className="position-absolute bottom-100 start-0 m-2 bg-white shadow rounded p-2 d-flex flex-column gap-2"
              style={{ width: 150 }}
            >
              <div
                className="d-flex align-items-center gap-2 cursor-pointer p-1 hover-bg-light"
                onClick={() => setShowPollModal(true)}
              >
                <FaSquarePollVertical /> Poll
              </div>
              <div
                className="d-flex align-items-center gap-2 cursor-pointer p-1 hover-bg-light"
                onClick={handleLocation}
              >
                <FaLocationDot /> Location
              </div>
              <div
                className="d-flex align-items-center gap-2 cursor-pointer p-1 hover-bg-light"
                onClick={() => fileInputRef.current.click()}
              >
                <FaImages /> Media
              </div>
            </div>
          )}

          <input
            type="file"
            multiple
            className="d-none"
            ref={fileInputRef}
            onChange={onFilesSelected}
          />

          <div className="flex-grow-1 bg-light rounded-pill px-3 py-2 d-flex align-items-center position-relative">
            {isRecording ? (
              <div className="d-flex align-items-center w-100 text-danger justify-content-between">
                <div
                  className="record-pulse rounded-circle bg-danger"
                  style={{ width: 10, height: 10 }}
                />
                <span className="fw-bold">
                  {new Date(recordingDuration * 1000)
                    .toISOString()
                    .substr(14, 5)}
                </span>
                <FaXmark
                  className="cursor-pointer"
                  onClick={() => stopRecording(false)}
                />
              </div>
            ) : (
              <>
                <input
                  className="bg-transparent border-0 w-100 no-focus-outline"
                  placeholder="Aa"
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) =>
                    e.key === "Enter" &&
                    (selectedFiles.length ? handleFileUpload() : handleSend())
                  }
                />
                <FaFaceSmile
                  className="text-primary cursor-pointer fs-5"
                  onClick={() => setShowEmojiPicker((s) => !s)}
                />
              </>
            )}
          </div>

          {isRecording ? (
            <FaPaperPlane
              className="text-primary cursor-pointer fs-4"
              onClick={() => stopRecording(true)}
            />
          ) : newMessage || selectedFiles.length ? (
            <FaPaperPlane
              className="text-primary cursor-pointer fs-4"
              onClick={
                selectedFiles.length ? handleFileUpload : () => handleSend()
              }
            />
          ) : (
            <FaMicrophone
              className="text-primary cursor-pointer fs-4"
              onClick={startRecording}
            />
          )}

          {!newMessage && !selectedFiles.length && !isRecording && (
            <span
              className="fs-4 cursor-pointer"
              onClick={() =>
                handleSend(conversation.quickReaction || "👍", "text")
              }
            >
              {conversation.quickReaction || "👍"}
            </span>
          )}
        </div>

        {showEmojiPicker && (
          <div className="position-absolute bottom-100 right-0 mb-2 shadow">
            <EmojiPicker
              onEmojiClick={(e) => setNewMessage((p) => p + e.emoji)}
            />
          </div>
        )}
      </div>

      {/* Modals / Overlays */}
      <PollModal
        show={showPollModal}
        onClose={() => setShowPollModal(false)}
        onSubmit={(data) => {
          handleSend("Poll", "poll", [], data);
          setShowPollModal(false);
        }}
      />
      <ChatInfoModal
        show={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        user={otherUser}
        conversation={conversation}
        currentUser={user}
        onUpdateSettings={(d) => setConversation((p) => ({ ...p, ...d }))}
      />
      {lightboxMedia && (
        <div
          className="position-fixed top-0 start-0 w-100 h-100 bg-black z-3 d-flex justify-content-center align-items-center"
          onClick={() => setLightboxMedia(null)}
        >
          <img src={lightboxMedia.url} className="mh-100 mw-100" alt="media" />
        </div>
      )}
    </div>
  );
};

export default ChatWindow;
