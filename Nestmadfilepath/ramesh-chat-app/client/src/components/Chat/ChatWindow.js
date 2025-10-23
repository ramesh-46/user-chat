


import React, { useState, useEffect, useRef, useContext } from "react";
import { fetchMessages, sendMessage, toggleStar, blockUser, unblockUser } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import MessageInput from "./MessageInput";
import CallUI from "../Call/CallButton";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
 // put ping.mp3 in public folder
import socket from "../../socket"; // adjust the path based on your folder structure

dayjs.extend(relativeTime);

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

export default function ChatWindow({ peer, onBack = () => {} }) {
  const { user } = useContext(AuthContext);
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(peer?.online || false);
  const [last, setLast] = useState(peer?.lastSeen || new Date());
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const bottom = useRef();
  const isMobile = useIsMobile();
 const notificationAudio = useRef(new Audio("/ping.mp3"));
  const userId = user?._id?.toString();
  const peerId = peer?._id?.toString();
const lastSoundTime = useRef(0);

useEffect(() => {
  if (!userId) return;

  console.log(`[Socket] User ${userId} joining room`);
  socket.emit("join", userId);

  const fetchInitialMessages = async () => {
    if (!peerId) return;
    try {
      const res = await fetchMessages(userId, peerId);
      setMsgs(res.data.messages);
    } catch (err) {
      console.error("Failed to load messages:", err);
    }
  };

  fetchInitialMessages();
}, [userId, peerId, socket]); // keep peerId only for fetching messages

  
  useEffect(() => {
    const checkBlockStatus = async () => {
      try {
        const response = await fetch(`/api/isBlocked/${userId}/${peerId}`);
        const data = await response.json();
        setIsUserBlocked(data.isBlocked);
      } catch (error) {
        console.error("Error checking block status:", error);
      }
    };
    if (userId && peerId) checkBlockStatus();
  }, [userId, peerId]);


 useEffect(() => {
  
  const SOUND_INTERVAL = 1200; // 1.2 seconds gap between sounds

  const recv = (m) => {
    if (!m || !m.sender || !m.receiver) return;

    const sender = m.sender?._id?.toString() || m.sender.toString();
    const receiver = m.receiver?._id?.toString() || m.receiver.toString();

    // 🔊 Throttled sound playback — only one ping every 1.2s
    if (receiver === userId && sender === peerId) {
      const now = Date.now();
      if (now - lastSoundTime.current > SOUND_INTERVAL) {
        notificationAudio.current.play().catch(err => console.log(err));
        lastSoundTime.current = now;
      }
    }

    // 💬 Add message if it’s between you and your peer
    if (
      (sender === userId && receiver === peerId) ||
      (sender === peerId && receiver === userId)
    ) {
      setMsgs((prev) => {
        if (!prev.some((msg) => msg._id === m._id)) {
          return [...prev, m];
        }
        return prev;
      });
    }
  };

  const typingH = (id) => {
    if (id === peerId) {
      setTyping(true);
      setTimeout(() => setTyping(false), 1500);
    }
  };

  const onlineH = (id) => {
    if (id === peerId) {
      setOnline(true);
      setLast(null);
    }
  };

  const offlineH = (id) => {
    if (id === peerId) {
      setOnline(false);
      setLast(new Date());
    }
  };

 
  
  socket.on("receiveMessage", recv);
  socket.on("peerTyping", typingH);
  socket.on("userOnline", onlineH);
  socket.on("userOffline", offlineH);

  return () => {
    socket.off("receiveMessage", recv);
    socket.off("peerTyping", typingH);
    socket.off("userOnline", onlineH);
    socket.off("userOffline", offlineH);
  };
}, [socket, userId, peerId, isUserBlocked]);
// useEffect(() => {
//   const onlineH = (id) => {
//     if (id === peerId) {
//       setOnline(true);
//       setLast(null);
//       setOnlineUsers((prev) => [...new Set([...prev, id])]);
//     }
//   };

//   const offlineH = (id) => {
//     if (id === peerId) {
//       setOnline(false);
//       setLast(new Date());
//       setOnlineUsers((prev) => prev.filter((u) => u !== id));
//     }
//   };

//   socket.on("userOnline", onlineH);
//   socket.on("userOffline", offlineH);

//   return () => {
//     socket.off("userOnline", onlineH);
//     socket.off("userOffline", offlineH);
//   };
// }, [peerId]);
// useEffect(() => {
//   const SOUND_INTERVAL = 1200; // 1.2 seconds gap between sounds

//   const recv = (m) => {
//     if (!m || !m.sender || !m.receiver) return;

//     const sender = m.sender?._id?.toString() || m.sender.toString();
//     const receiver = m.receiver?._id?.toString() || m.receiver.toString();

//     if (receiver === userId && sender === peerId) {
//       const now = Date.now();
//       if (now - lastSoundTime.current > SOUND_INTERVAL) {
//         notificationAudio.current.play().catch(err => console.log(err));
//         lastSoundTime.current = now;
//       }
//     }

//     if (
//       (sender === userId && receiver === peerId) ||
//       (sender === peerId && receiver === userId)
//     ) {
//       setMsgs((prev) => {
//         if (!prev.some((msg) => msg._id === m._id)) {
//           return [...prev, m];
//         }
//         return prev;
//       });
//     }
//   };

//   const typingH = (id) => {
//     if (id === peerId) {
//       setTyping(true);
//       setTimeout(() => setTyping(false), 1500);
//     }
//   };

//   // ✅ Removed the old onlineH/offlineH references here

//   socket.on("receiveMessage", recv);
//   socket.on("peerTyping", typingH);

//   return () => {
//     socket.off("receiveMessage", recv);
//     socket.off("peerTyping", typingH);
//   };
// }, [socket, userId, peerId, isUserBlocked]);

// Separate useEffect for online/offline status
// useEffect(() => {
//   const onlineH = (id) => {
//     if (id === peerId) {
//       setOnline(true);
//       setLast(null);
//       setOnlineUsers((prev) => [...new Set([...prev, id])]);
//     }
//   };

//   const offlineH = (id) => {
//     if (id === peerId) {
//       setOnline(false);
//       setLast(new Date());
//       setOnlineUsers((prev) => prev.filter((u) => u !== id));
//     }
//   };

//   socket.on("userOnline", onlineH);
//   socket.on("userOffline", offlineH);

//   return () => {
//     socket.off("userOnline", onlineH);
//     socket.off("userOffline", offlineH);
//   };
// }, [peerId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (text, file, fileType, content) => {
    if (isUserBlocked) {
      console.log("Cannot send message: You are blocked.");
      return;
    }

    const fd = new FormData();
    fd.append("sender", userId);
    fd.append("receiver", peerId);
    if (text) fd.append("text", text);
    if (file) fd.append("file", file);
    if (fileType) fd.append("fileType", fileType);
    if (content) fd.append("content", content);

    try {
      const res = await sendMessage(fd);
      const message = res.data.message;
      socket.emit("sendMessage", message);
      setMsgs((prev) => {
        if (!prev.some((msg) => msg._id === message._id)) {
          return [...prev, message];
        }
        return prev;
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  const handleBlockUser = async () => {
    try {
      await blockUser(userId, peerId);
      setIsUserBlocked(true);
      setShowBlockDialog(false);
    } catch (error) {
      console.error("Error blocking user:", error);
    }
  };

  const handleUnblockUser = async () => {
    try {
      await unblockUser(userId, peerId);
      setIsUserBlocked(false);
    } catch (error) {
      console.error("Error unblocking user:", error);
    }
  };

  const fileURL = (p) => `https://blackpearlbackend.onrender.com${p}`;

  const handleLongPress = (id) => {
    setMsgs((prev) =>
      prev.map((msg) => (msg._id === id ? { ...msg, marked: !msg.marked } : msg))
    );
  };

  const handleDoubleClick = (id) => {
    setMsgs((prev) =>
      prev.map((msg) => (msg._id === id ? { ...msg, marked: !msg.marked } : msg))
    );
  };

  useEffect(() => {
    const reconnectHandler = () => {
      console.log("[Socket] Reconnected. Rejoining room...");
      socket.emit("join", userId);
    };

    socket.on("reconnect", reconnectHandler);

    return () => {
      socket.off("reconnect", reconnectHandler);
    };
  }, [socket, userId]);

  const ACCENT20 = "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))";
  const mineStyle = { background: "#FFFFFF", color: "var(--primarySoft)" };
  const otherStyle = { background: "white", color: "black" };
  const headLeftStyle = { ...S.headLeft, fontSize: isMobile ? "0.8rem" : S.headLeft.fontSize };
  const headRightStyle = { ...S.headRight, fontSize: isMobile ? "0.7rem" : S.headRight.fontSize };
const [onlineUsers, setOnlineUsers] = useState([]);

  return (
    <div style={{ ...S.win, width: isMobile ? "100%" : "auto" }}>
      <div style={{ ...S.head, background: ACCENT20, color: "var(--textMain)" }}>
        {isMobile && <button style={S.back} onClick={onBack}>←</button>}
        <div style={headLeftStyle}>{peer.mobile || peer.username}</div>
  
        <CallUI peer={peer} onlineUsers={onlineUsers} />


        <button
          style={{
            backgroundColor: "green",
            color: "white",
            border: "none",
            borderRadius: "50%",
            width: "30px",
            height: "30px",
            cursor: "pointer",
            marginLeft: "10px",
            fontSize: "12px"
          }}
          onClick={() => {
            if (isUserBlocked) {
              handleUnblockUser();
            } else {
              setShowBlockDialog(true);
            }
          }}
        >
          {isUserBlocked ? "🔓" : "🔒"}
        </button>
        <small style={headRightStyle}>
          {online ? <span style={{ color: "#0f0" }}>● Online</span> : `Last seen ${dayjs(last).fromNow()}`}
        </small>
      </div>
      {showBlockDialog && (
        <div style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "black",
          color: "white",
          fontFamily: "var(--font-ui)",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
          zIndex: 1000,
          textAlign: "center",
        }}>
          <p style={{
            fontWeight: "bold",
            fontSize: isMobile ? "0.9rem" : "1rem",
            margin: "10px 0"
          }}>
            Are you sure you want to block this user?
          </p>
          <button
            style={{
              backgroundColor: "red",
              color: "white",
              border: "none",
              padding: "8px 16px",
              margin: "5px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onClick={handleBlockUser}
          >
            Yes, Block
          </button>
          <button
            style={{
              backgroundColor: "green",
              color: "white",
              border: "none",
              padding: "8px 16px",
              margin: "5px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onClick={() => setShowBlockDialog(false)}
          >
            Cancel
          </button>
        </div>
      )}
      {typing && (
        <div style={S.typing}>
          <i className="fas fa-pen-nib" style={S.icon} /> … typing
        </div>
      )}
      <div style={S.flow}>
        {msgs.map((m) => {
          const mine = m.sender.toString() === userId;
          return (
            <motion.div
              key={m._id}
              style={{
                ...S.bubble,
                ...(mine ? mineStyle : otherStyle),
                alignSelf: mine ? "flex-end" : "flex-start",
                backgroundColor: m.marked ? "lightgreen" : (mine ? mineStyle.background : otherStyle.background),
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onTouchStart={isMobile ? () => handleLongPress(m._id) : undefined}
              onDoubleClick={!isMobile ? () => handleDoubleClick(m._id) : undefined}
            >
              {m.text && (
                <span style={{ ...S.messageText, fontWeight: 'bold', color: 'black', fontFamily: "'Inter', sans-serif", 
  fontVariant: 'normal',  
  textTransform: 'none'  }}>
                  {m.text}
                </span>
              )}
              {m.file && m.fileType === "image" && (
                <img
                  src={fileURL(m.file)}
                  alt="sent"
                  style={isMobile ? { ...S.thumbnail, maxWidth: 120, maxHeight: 120 } : S.thumbnail}
                  onClick={() => window.open(fileURL(m.file), "_blank")}
                />
              )}
              {m.file && m.fileType === "video" && (
                <video
                  style={isMobile ? { ...S.thumbnail, maxWidth: 120, maxHeight: 120 } : S.thumbnail}
                  controls
                  onClick={() => window.open(fileURL(m.file), "_blank")}
                >
                  <source src={fileURL(m.file)} type="video/mp4" />
                </video>
              )}
              {m.file && m.fileType === "audio" && (
                <audio controls style={isMobile ? { ...S.audioPlayer, width: 150 } : S.audioPlayer}>
                  <source src={fileURL(m.file)} type="audio/webm" />
                </audio>
              )}
              {m.file && m.fileType === "document" && (
                <a href={fileURL(m.file)} download style={S.documentLink}>
                  Download Document
                </a>
              )}
              {m.fileType === "location" && m.content && (
                <div style={isMobile ? { ...S.mapContainer, width: "120px", height: "120px" } : S.mapContainer}>
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://maps.google.com/maps?q=${m.content.lat},${m.content.lng}&z=15&output=embed`}
                  ></iframe>
                </div>
              )}
              {m.fileType === "contact" && m.content && (
                <div style={S.contactBox}>
                  <p style={{ ...S.contactName, fontWeight: isMobile ? 500 : "bold" }}>{m.content.name}</p>
                  <p style={S.contactPhone}>{m.content.phone}</p>
                </div>
              )}
              {m.fileType === "poll" && m.content && (
                <div style={S.pollBox}>
                  <p style={{ ...S.pollQuestion, fontWeight: isMobile ? 500 : "bold" }}>{m.content.question}</p>
                  <div style={S.pollOptions}>
                    {m.content.options.map((option, index) => (
                      <button key={index} style={S.pollOption}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
        <div ref={bottom} />
      </div>
      <MessageInput
        onSend={send}
        onTyping={() => {
          socket.emit("typing", { from: userId, to: peerId });
        }}
        disabled={isUserBlocked}
        placeholder={isUserBlocked ? "This user is blocked. You cannot send messages." : "Type a message"}
      />
    </div>
  );
}

const S = {
  win: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "var(--surfaceAlt)",
    height: "100%",
    overflow: "hidden",
    fontFamily: "var(--font-ui)",
  },
  head: {
    padding: "16px 20px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  back: {
    border: "none",
    background: "transparent",
    fontSize: "1.6rem",
    cursor: "pointer",
    lineHeight: 1,
    color: "var(--textMain)",
  },
  headLeft: {
    fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
    flex: 1,
  },
  headRight: {
    fontSize: "clamp(0.85rem, 2.2vw, 1rem)",
  },
  typing: {
    padding: "2px 20px",
    fontSize: "clamp(0.9rem, 2.3vw, 1rem)",
    color: "var(--primary)",
    marginBottom: 8,
  },
  icon: { marginRight: 4, fontSize: 14 },
  flow: {
    flex: 1,
    padding: 20,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    scrollbarColor: "transparent transparent",
  },
  bubble: {
    maxWidth: "70%",
    padding: "14px 16px",
    borderRadius: 14,
    wordBreak: "break-word",
    boxShadow: "0 3px 6px rgba(0,0,0,.12)",
    position: "relative",
  },
  messageText: {
    fontSize: "clamp(1.05rem, 2.4vw, 1.15rem)",
    lineHeight: 1.45,
  },
  thumbnail: {
    maxWidth: 220,
    maxHeight: 220,
    borderRadius: 10,
    marginTop: 8,
    cursor: "zoom-in",
  },
  audioPlayer: { width: 220, marginTop: 8 },
  documentLink: {
    display: "block",
    marginTop: 8,
    color: "var(--primary)",
    textDecoration: "underline",
    cursor: "pointer",
  },
  mapContainer: {
    width: "200px",
    height: "200px",
    margin: "10px 0",
  },
  contactBox: {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "10px",
    backgroundColor: "#f9f9f9",
    margin: "10px 0",
  },
  contactName: {
    fontWeight: "bold",
    margin: "5px 0",
  },
  contactPhone: {
    margin: "5px 0",
    color: "#555",
  },
  pollBox: {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "10px",
    backgroundColor: "#f9f9f9",
    margin: "10px 0",
  },
  pollQuestion: {
    fontWeight: "bold",
    margin: "5px 0",
  },
  pollOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  pollOption: {
    padding: "8px",
    backgroundColor: "#e0e0e0",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    textAlign: "center",
  },
};
























