import React, { useState, useEffect, useRef, useContext } from "react";
import { fetchMessages, sendMessage, blockUser, unblockUser } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import MessageInput from "./MessageInput";
import CallUI from "../Call/CallButton";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import socket from "../../socket";
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

const linkifyText = (text) => {
  const urlRegex = /((https?:\/\/[^\s]+))/g;
  return text.split(urlRegex).map((part, i) =>
    urlRegex.test(part) ? (
      <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc" }}>
        {part}
      </a>
    ) : part
  );
};

export default function ChatWindow({ peer, onBack = () => {} }) {
  const { user } = useContext(AuthContext);
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(peer?.online || false);
  const [last, setLast] = useState(peer?.lastSeen || new Date());
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState([]);
  const [showScrollDown, setShowScrollDown] = useState(false);
  const bottom = useRef();
  const flowRef = useRef();
  const isMobile = useIsMobile();
  const notificationAudio = useRef(new Audio("/ping.mp3"));
  const userId = user?._id?.toString();
  const peerId = peer?._id?.toString();
  const lastSoundTime = useRef(0);

  const [longPressActivated, setLongPressActivated] = useState(false); // first long-press done
  const touchTimeout = useRef(null);

  // join socket room
  useEffect(() => {
    if (!userId) return;
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
  }, [userId, peerId]);

  // block status
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

  // receive messages
  useEffect(() => {
    const SOUND_INTERVAL = 1200;

    const recv = (m) => {
      if (!m || !m.sender || !m.receiver) return;
      const sender = m.sender?._id?.toString() || m.sender.toString();
      const receiver = m.receiver?._id?.toString() || m.receiver.toString();

      if (receiver === userId && sender === peerId) {
        const now = Date.now();
        if (now - lastSoundTime.current > SOUND_INTERVAL) {
          notificationAudio.current.play().catch(err => console.log(err));
          lastSoundTime.current = now;
        }
      }

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
  }, [socket, userId, peerId]);

  useEffect(() => {
    if (selectedMessages.length === 0 && !showScrollDown) bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, selectedMessages, showScrollDown]);

  const send = async (text, file, fileType, content) => {
    if (isUserBlocked) return;
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
        if (!prev.some((msg) => msg._id === message._id)) return [...prev, message];
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

  // ---- selection logic ----
  const toggleSelectMessage = (id) => {
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const copySelected = () => {
    const texts = msgs
      .filter((m) => selectedMessages.includes(m._id))
      .map((m) => m.text)
      .filter(Boolean)
      .join("\n");
    if (texts) navigator.clipboard.writeText(texts).then(() => alert("Copied!"));
    setSelectedMessages([]);
  };

  const shareSelected = () => {
    const texts = msgs
      .filter((m) => selectedMessages.includes(m._id))
      .map((m) => m.text)
      .filter(Boolean)
      .join("\n");
    if (texts) {
      if (navigator.share) navigator.share({ text: texts }).catch(console.error);
      else alert("Share API not supported.");
    }
    setSelectedMessages([]);
  };

  // handle scroll to show scroll-down button
  const handleScroll = () => {
    const el = flowRef.current;
    if (!el) return;
    if (el.scrollTop + el.clientHeight < el.scrollHeight - 50) {
      setShowScrollDown(true);
    } else {
      setShowScrollDown(false);
    }
  };

  const ACCENT20 = "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))";
  const mineStyle = { background: "#a5eeadff", color: "black" };
  const otherStyle = { background: "#FFFFFF", color: "black" };
  const headLeftStyle = { ...S.headLeft, fontSize: isMobile ? "0.8rem" : S.headLeft.fontSize };
  const headRightStyle = { ...S.headRight, fontSize: isMobile ? "0.7rem" : S.headRight.fontSize };

  return (
    <div style={{ ...S.win, width: isMobile ? "100%" : "auto" }}>
      <div style={{ ...S.head, background: ACCENT20, color: "var(--textMain)" }}>
        {isMobile && <button style={S.back} onClick={() => onBack()}>←</button>}
        <div style={headLeftStyle}>{peer.mobile || peer.username}</div>
        <CallUI peer={peer} />
        <button
          style={{
            backgroundColor: isUserBlocked ? "red" : "green",
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
            if (isUserBlocked) handleUnblockUser();
            else setShowBlockDialog(true);
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
          position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
          backgroundColor: "black", color: "white", fontFamily: "var(--font-ui)",
          padding: "20px", borderRadius: "10px", zIndex: 1000, textAlign: "center"
        }}>
          <p style={{ fontWeight: "bold", fontSize: isMobile ? "0.9rem" : "1rem", margin: "10px 0" }}>
            Are you sure you want to block this user?
          </p>
          <button style={{ backgroundColor: "red", color: "white", border: "none", padding: "8px 16px", margin: 5, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }} onClick={handleBlockUser}>
            Yes, Block
          </button>
          <button style={{ backgroundColor: "green", color: "white", border: "none", padding: "8px 16px", margin: 5, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }} onClick={() => setShowBlockDialog(false)}>
            Cancel
          </button>
        </div>
      )}

      {typing && <div style={S.typing}><i className="fas fa-pen-nib" style={S.icon} /> … typing</div>}

      {/* Message Flow */}
      <div ref={flowRef} style={S.flow} onScroll={handleScroll}>
        {msgs.map((m) => {
          const mine = m.sender.toString() === userId;
          const selected = selectedMessages.includes(m._id);
          return (
            <motion.div
              key={m._id}
              style={{
                ...S.bubble,
                ...(mine ? mineStyle : otherStyle),
                alignSelf: mine ? "flex-end" : "flex-start",
                backgroundColor: selected ? "#a0cfff" : (mine ? mineStyle.background : otherStyle.background),
                position: "relative",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onTouchStart={isMobile ? () => {
                if (!longPressActivated) {
                  touchTimeout.current = setTimeout(() => {
                    toggleSelectMessage(m._id);
                    setLongPressActivated(true);
                  }, 3000); // first long press 3 sec
                } else {
                  toggleSelectMessage(m._id); // subsequent taps auto-select
                }
              } : undefined}
              onTouchEnd={isMobile ? () => {
                clearTimeout(touchTimeout.current);
              } : undefined}
              onClick={!isMobile ? (e) => { if (e.ctrlKey || e.metaKey) toggleSelectMessage(m._id); } : undefined}
            >
              {m.text && <span style={{ textTransform: "none" }}>{linkifyText(m.text)}</span>}
              {m.file && m.fileType === "image" && <img src={fileURL(m.file)} alt="sent" style={S.thumbnail} onClick={() => window.open(fileURL(m.file), "_blank")} />}
              {m.file && m.fileType === "video" && <video style={S.thumbnail} controls onClick={() => window.open(fileURL(m.file), "_blank")}><source src={fileURL(m.file)} type="video/mp4" /></video>}
              {m.file && m.fileType === "audio" && <audio controls style={S.audioPlayer}><source src={fileURL(m.file)} type="audio/webm" /></audio>}
            </motion.div>
          );
        })}
        <div ref={bottom} />
      </div>

      {/* Scroll-down button */}
      {showScrollDown && (
        <div onClick={() => bottom.current.scrollIntoView({ behavior: "smooth" })} style={{
          position: "fixed", bottom: 70, right: 20, width: 36, height: 36, borderRadius: "50%", backgroundColor: "#555", color: "white", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 20, zIndex: 100
        }}>
          ↓
        </div>
      )}

      {/* Action toolbar */}
      {selectedMessages.length > 0 && (
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          backgroundColor: "#333", color: "white", display: "flex",
          justifyContent: "space-around", padding: "8px 0", zIndex: 100
        }}>
          <button onClick={copySelected} style={S.toolbarButton}>📋 Copy</button>
          <button onClick={shareSelected} style={S.toolbarButton}>📤 Share</button>
          <button onClick={() => setSelectedMessages([])} style={S.toolbarButton}>❌ Cancel</button>
        </div>
      )}

      <MessageInput
        onSend={send}
        onTyping={() => socket.emit("typing", { from: userId, to: peerId })}
        disabled={isUserBlocked}
        placeholder={isUserBlocked ? "This user is blocked" : "Type a message"}
      />
    </div>
  );
}

const S = {
  win: { flex: 1, display: "flex", flexDirection: "column", background: "var(--surfaceAlt)", height: "100%", overflow: "hidden", fontFamily: "var(--font-ui)" },
  head: { padding: "16px 20px", fontWeight: 700, display: "flex", alignItems: "center", gap: 12 },
  back: { border: "none", background: "transparent", fontSize: "1.6rem", cursor: "pointer", lineHeight: 1, color: "var(--textMain)" },
  headLeft: { fontSize: "clamp(1rem, 2.5vw, 1.25rem)", flex: 1 },
  headRight: { fontSize: "clamp(0.85rem, 2.2vw, 1rem)" },
  typing: { padding: "2px 20px", fontSize: "clamp(0.9rem, 2.3vw, 1rem)", color: "var(--primary)", marginBottom: 8 },
  icon: { marginRight: 4, fontSize: 14 },
  flow: { flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none", msOverflowStyle: "none" },
  bubble: { maxWidth: "70%", padding: "14px 16px", borderRadius: 14, wordBreak: "break-word", boxShadow: "0 3px 6px rgba(0,0,0,.12)", position: "relative", cursor: "pointer" },
  thumbnail: { maxWidth: 220, maxHeight: 220, borderRadius: 10, marginTop: 8, cursor: "zoom-in" },
  audioPlayer: { width: 220, marginTop: 8 },
  toolbarButton: { background: "transparent", color: "white", border: "none", fontSize: 16, cursor: "pointer", padding: "4px 12px" },
};





















// import React, { useState, useEffect, useRef, useContext } from "react";
// import { fetchMessages, sendMessage, blockUser, unblockUser } from "../../api";
// import { AuthContext } from "../../contexts/AuthContext";
// import MessageInput from "./MessageInput";
// import CallUI from "../Call/CallButton";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";
// import socket from "../../socket";
// dayjs.extend(relativeTime);

// const useIsMobile = () => {
//   const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
//   useEffect(() => {
//     const handleResize = () => setIsMobile(window.innerWidth <= 768);
//     window.addEventListener("resize", handleResize);
//     return () => window.removeEventListener("resize", handleResize);
//   }, []);
//   return isMobile;
// };

// // utility to detect URLs in text and make clickable links
// const linkifyText = (text) => {
//   const urlRegex = /((https?:\/\/[^\s]+))/g;
//   return text.split(urlRegex).map((part, i) =>
//     urlRegex.test(part) ? (
//       <a key={i} href={part} target="_blank" rel="noopener noreferrer" style={{ color: "#0066cc" }}>
//         {part}
//       </a>
//     ) : (
//       part
//     )
//   );
// };

// export default function ChatWindow({ peer, onBack = () => {} }) {
//   const { user } = useContext(AuthContext);
//   const [msgs, setMsgs] = useState([]);
//   const [typing, setTyping] = useState(false);
//   const [online, setOnline] = useState(peer?.online || false);
//   const [last, setLast] = useState(peer?.lastSeen || new Date());
//   const [isUserBlocked, setIsUserBlocked] = useState(false);
//   const [showBlockDialog, setShowBlockDialog] = useState(false);
//   const [selectedMessages, setSelectedMessages] = useState([]);
//   const bottom = useRef();
//   const isMobile = useIsMobile();
//   const notificationAudio = useRef(new Audio("/ping.mp3"));
//   const userId = user?._id?.toString();
//   const peerId = peer?._id?.toString();
//   const lastSoundTime = useRef(0);

//   // join socket room
//   useEffect(() => {
//     if (!userId) return;
//     socket.emit("join", userId);

//     const fetchInitialMessages = async () => {
//       if (!peerId) return;
//       try {
//         const res = await fetchMessages(userId, peerId);
//         setMsgs(res.data.messages);
//       } catch (err) {
//         console.error("Failed to load messages:", err);
//       }
//     };
//     fetchInitialMessages();
//   }, [userId, peerId]);

//   // block status
//   useEffect(() => {
//     const checkBlockStatus = async () => {
//       try {
//         const response = await fetch(`/api/isBlocked/${userId}/${peerId}`);
//         const data = await response.json();
//         setIsUserBlocked(data.isBlocked);
//       } catch (error) {
//         console.error("Error checking block status:", error);
//       }
//     };
//     if (userId && peerId) checkBlockStatus();
//   }, [userId, peerId]);

//   // receive messages
//   useEffect(() => {
//     const SOUND_INTERVAL = 1200;

//     const recv = (m) => {
//       if (!m || !m.sender || !m.receiver) return;
//       const sender = m.sender?._id?.toString() || m.sender.toString();
//       const receiver = m.receiver?._id?.toString() || m.receiver.toString();

//       if (receiver === userId && sender === peerId) {
//         const now = Date.now();
//         if (now - lastSoundTime.current > SOUND_INTERVAL) {
//           notificationAudio.current.play().catch(err => console.log(err));
//           lastSoundTime.current = now;
//         }
//       }

//       if (
//         (sender === userId && receiver === peerId) ||
//         (sender === peerId && receiver === userId)
//       ) {
//         setMsgs((prev) => {
//           if (!prev.some((msg) => msg._id === m._id)) {
//             return [...prev, m];
//           }
//           return prev;
//         });
//       }
//     };

//     const typingH = (id) => {
//       if (id === peerId) {
//         setTyping(true);
//         setTimeout(() => setTyping(false), 1500);
//       }
//     };

//     const onlineH = (id) => {
//       if (id === peerId) {
//         setOnline(true);
//         setLast(null);
//       }
//     };

//     const offlineH = (id) => {
//       if (id === peerId) {
//         setOnline(false);
//         setLast(new Date());
//       }
//     };

//     socket.on("receiveMessage", recv);
//     socket.on("peerTyping", typingH);
//     socket.on("userOnline", onlineH);
//     socket.on("userOffline", offlineH);

//     return () => {
//       socket.off("receiveMessage", recv);
//       socket.off("peerTyping", typingH);
//       socket.off("userOnline", onlineH);
//       socket.off("userOffline", offlineH);
//     };
//   }, [socket, userId, peerId]);

//   useEffect(() => {
//     bottom.current?.scrollIntoView({ behavior: "smooth" });
//   }, [msgs, selectedMessages]);

//   const send = async (text, file, fileType, content) => {
//     if (isUserBlocked) return;
//     const fd = new FormData();
//     fd.append("sender", userId);
//     fd.append("receiver", peerId);
//     if (text) fd.append("text", text);
//     if (file) fd.append("file", file);
//     if (fileType) fd.append("fileType", fileType);
//     if (content) fd.append("content", content);

//     try {
//       const res = await sendMessage(fd);
//       const message = res.data.message;
//       socket.emit("sendMessage", message);
//       setMsgs((prev) => {
//         if (!prev.some((msg) => msg._id === message._id)) return [...prev, message];
//         return prev;
//       });
//     } catch (error) {
//       console.error("Error sending message:", error);
//     }
//   };

//   const handleBlockUser = async () => {
//     try {
//       await blockUser(userId, peerId);
//       setIsUserBlocked(true);
//       setShowBlockDialog(false);
//     } catch (error) {
//       console.error("Error blocking user:", error);
//     }
//   };

//   const handleUnblockUser = async () => {
//     try {
//       await unblockUser(userId, peerId);
//       setIsUserBlocked(false);
//     } catch (error) {
//       console.error("Error unblocking user:", error);
//     }
//   };

//   const fileURL = (p) => `https://blackpearlbackend.onrender.com${p}`;

//   // ---- selection logic ----
//   const toggleSelectMessage = (id) => {
//     setSelectedMessages((prev) =>
//       prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
//     );
//   };

//   const copySelected = () => {
//     const texts = msgs
//       .filter((m) => selectedMessages.includes(m._id))
//       .map((m) => m.text)
//       .filter(Boolean)
//       .join("\n");
//     if (texts) navigator.clipboard.writeText(texts).then(() => alert("Copied!"));
//     setSelectedMessages([]);
//   };

//   const shareSelected = () => {
//     const texts = msgs
//       .filter((m) => selectedMessages.includes(m._id))
//       .map((m) => m.text)
//       .filter(Boolean)
//       .join("\n");
//     if (texts) {
//       if (navigator.share) navigator.share({ text: texts }).catch(console.error);
//       else alert("Share API not supported.");
//     }
//     setSelectedMessages([]);
//   };

//   const ACCENT20 = "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))";
//   const mineStyle = { background: "#a5eeadff", color: "black" };
//   const otherStyle = { background: "#FFFFFF", color: "black" };
//   const headLeftStyle = { ...S.headLeft, fontSize: isMobile ? "0.8rem" : S.headLeft.fontSize };
//   const headRightStyle = { ...S.headRight, fontSize: isMobile ? "0.7rem" : S.headRight.fontSize };

//   return (
//     <div style={{ ...S.win, width: isMobile ? "100%" : "auto" }}>
//       <div style={{ ...S.head, background: ACCENT20, color: "var(--textMain)" }}>
//         {isMobile && <button style={S.back} onClick={() => onBack()}>←</button>}
//         <div style={headLeftStyle}>{peer.mobile || peer.username}</div>
//         <CallUI peer={peer} />
//         <button
//           style={{
//             backgroundColor: isUserBlocked ? "red" : "green",
//             color: "white",
//             border: "none",
//             borderRadius: "50%",
//             width: "30px",
//             height: "30px",
//             cursor: "pointer",
//             marginLeft: "10px",
//             fontSize: "12px"
//           }}
//           onClick={() => {
//             if (isUserBlocked) handleUnblockUser();
//             else setShowBlockDialog(true);
//           }}
//         >
//           {isUserBlocked ? "🔓" : "🔒"}
//         </button>
//         <small style={headRightStyle}>
//           {online ? <span style={{ color: "#0f0" }}>● Online</span> : `Last seen ${dayjs(last).fromNow()}`}
//         </small>
//       </div>

//       {showBlockDialog && (
//         <div style={{
//           position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)",
//           backgroundColor: "black", color: "white", fontFamily: "var(--font-ui)",
//           padding: "20px", borderRadius: "10px", zIndex: 1000, textAlign: "center"
//         }}>
//           <p style={{ fontWeight: "bold", fontSize: isMobile ? "0.9rem" : "1rem", margin: "10px 0" }}>
//             Are you sure you want to block this user?
//           </p>
//           <button style={{ backgroundColor: "red", color: "white", border: "none", padding: "8px 16px", margin: 5, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }} onClick={handleBlockUser}>
//             Yes, Block
//           </button>
//           <button style={{ backgroundColor: "green", color: "white", border: "none", padding: "8px 16px", margin: 5, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }} onClick={() => setShowBlockDialog(false)}>
//             Cancel
//           </button>
//         </div>
//       )}

//       {typing && <div style={S.typing}><i className="fas fa-pen-nib" style={S.icon} /> … typing</div>}

//       {/* Message Flow */}
//       <div style={S.flow}>
//         {msgs.map((m) => {
//           const mine = m.sender.toString() === userId;
//           const selected = selectedMessages.includes(m._id);
//           return (
//             <motion.div
//               key={m._id}
//               style={{
//                 ...S.bubble,
//                 ...(mine ? mineStyle : otherStyle),
//                 alignSelf: mine ? "flex-end" : "flex-start",
//                 backgroundColor: selected ? "#a0cfff" : (mine ? mineStyle.background : otherStyle.background),
//                 position: "relative",
//               }}
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               onTouchStart={isMobile ? () => toggleSelectMessage(m._id) : undefined}
//               onClick={!isMobile ? (e) => { if (e.ctrlKey || e.metaKey) toggleSelectMessage(m._id); } : undefined}
//             >
//               {m.text && <span style={{ textTransform: "none" }}>{linkifyText(m.text)}</span>}
//               {m.file && m.fileType === "image" && <img src={fileURL(m.file)} alt="sent" style={S.thumbnail} onClick={() => window.open(fileURL(m.file), "_blank")} />}
//               {m.file && m.fileType === "video" && <video style={S.thumbnail} controls onClick={() => window.open(fileURL(m.file), "_blank")}><source src={fileURL(m.file)} type="video/mp4" /></video>}
//               {m.file && m.fileType === "audio" && <audio controls style={S.audioPlayer}><source src={fileURL(m.file)} type="audio/webm" /></audio>}
//             </motion.div>
//           );
//         })}
//         <div ref={bottom} />
//       </div>

//       {/* Action toolbar */}
//       {selectedMessages.length > 0 && (
//         <div style={{
//           position: "fixed", bottom: 0, left: 0, right: 0,
//           backgroundColor: "#333", color: "white", display: "flex",
//           justifyContent: "space-around", padding: "8px 0", zIndex: 100
//         }}>
//           <button onClick={copySelected} style={S.toolbarButton}>📋 Copy</button>
//           <button onClick={shareSelected} style={S.toolbarButton}>📤 Share</button>
//           <button onClick={() => setSelectedMessages([])} style={S.toolbarButton}>❌ Cancel</button>
//         </div>
//       )}

//       <MessageInput
//         onSend={send}
//         onTyping={() => socket.emit("typing", { from: userId, to: peerId })}
//         disabled={isUserBlocked}
//         placeholder={isUserBlocked ? "This user is blocked" : "Type a message"}
//       />
//     </div>
//   );
// }

// const S = {
//   win: { flex: 1, display: "flex", flexDirection: "column", background: "var(--surfaceAlt)", height: "100%", overflow: "hidden", fontFamily: "var(--font-ui)" },
//   head: { padding: "16px 20px", fontWeight: 700, display: "flex", alignItems: "center", gap: 12 },
//   back: { border: "none", background: "transparent", fontSize: "1.6rem", cursor: "pointer", lineHeight: 1, color: "var(--textMain)" },
//   headLeft: { fontSize: "clamp(1rem, 2.5vw, 1.25rem)", flex: 1 },
//   headRight: { fontSize: "clamp(0.85rem, 2.2vw, 1rem)" },
//   typing: { padding: "2px 20px", fontSize: "clamp(0.9rem, 2.3vw, 1rem)", color: "var(--primary)", marginBottom: 8 },
//   icon: { marginRight: 4, fontSize: 14 },
//   flow: { flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, scrollbarWidth: "none", msOverflowStyle: "none" },
//   bubble: { maxWidth: "70%", padding: "14px 16px", borderRadius: 14, wordBreak: "break-word", boxShadow: "0 3px 6px rgba(0,0,0,.12)", position: "relative", cursor: "pointer" },
//   thumbnail: { maxWidth: 220, maxHeight: 220, borderRadius: 10, marginTop: 8, cursor: "zoom-in" },
//   audioPlayer: { width: 220, marginTop: 8 },
//   toolbarButton: { background: "transparent", color: "white", border: "none", fontSize: 16, cursor: "pointer", padding: "4px 12px" },
// };

