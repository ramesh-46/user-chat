import React, { useState, useEffect, useRef, useContext } from "react";
import { fetchMessages, sendMessage, blockUser, unblockUser, deleteDirectMessage, markConversationRead } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import MessageInput from "./MessageInput";
import ForwardPicker from "./ForwardPicker";

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
  const typingTimeout = useRef(null);
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
  const userId = String(user?._id || user?.userId || "");
  const peerId = peer?._id?.toString();
  const lastSoundTime = useRef(0);

  const [contextMessage, setContextMessage] = useState(null);
  const [showForwardPicker, setShowForwardPicker] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchKind, setSearchKind] = useState("all");
  const [searchSender, setSearchSender] = useState("all");
  const [replyTo, setReplyTo] = useState(null);
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
        markConversationRead(userId, peerId).catch((error) => console.warn("Read receipt update failed:", error));
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
        if (sender === peerId && receiver === userId) markConversationRead(userId, peerId).catch(() => {});
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
        clearTimeout(typingTimeout.current);
        typingTimeout.current = setTimeout(() => setTyping(false), 1800);
      }
    };
    const typingStopH = (id) => {
      if (id === peerId) {
        clearTimeout(typingTimeout.current);
        setTyping(false);
      }
    };

    const onlineH = (id) => {
      if (id === peerId) {
        setOnline(true);
        setLast(null);
      }
    };

    const offlineH = (payload) => {
      const id = payload?.userId || payload;
      if (String(id) === String(peerId)) {
        setOnline(false);
        setLast(payload?.lastSeen || new Date());
      }
    };

    const deletedH = ({ messageId }) => {
      setMsgs(prev => prev.map(m => m._id === messageId ? { ...m, deletedForEveryone: true, text: "", file: null } : m));
    };

    socket.on("receiveMessage", recv);
    socket.on("direct:message-deleted", deletedH);
    socket.on("peerTyping", typingH);
    socket.on("peerTypingStop", typingStopH);
    socket.on("userOnline", onlineH);
    socket.on("userOffline", offlineH);

    return () => {
      socket.off("receiveMessage", recv);
      socket.off("direct:message-deleted", deletedH);
      socket.off("peerTyping", typingH);
      socket.off("peerTypingStop", typingStopH);
      clearTimeout(typingTimeout.current);
      socket.off("userOnline", onlineH);
      socket.off("userOffline", offlineH);
    };
  }, [socket, userId, peerId]);

  useEffect(() => {
    if (selectedMessages.length === 0 && !showScrollDown) bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs, selectedMessages, showScrollDown]);

  const send = async (text, file, fileType, content) => {
    if (isUserBlocked) return;
    const pendingId = `pending-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const optimistic = {
      _id: pendingId, sender: userId, receiver: peerId, text: text || "",
      fileType: fileType || "", createdAt: new Date().toISOString(), pending: true,
    };
    setMsgs((prev) => [...prev, optimistic]);
    const fd = new FormData();
    fd.append("sender", userId);
    fd.append("receiver", peerId);
    if (text) fd.append("text", text);
    if (file) fd.append("file", file);
    if (fileType) fd.append("fileType", fileType);
    if (content) fd.append("content", content);
    if (replyTo?._id) fd.append("replyTo", replyTo._id);
    try {
      const res = await sendMessage(fd);
      const message = res.data.message;
      setReplyTo(null);
      setMsgs((prev) => prev.map((item) => item._id === pendingId ? message : item)
        .filter((item, index, items) => items.findIndex((entry) => entry._id === item._id) === index));
    } catch (error) {
      setMsgs((prev) => prev.filter((item) => item._id !== pendingId));
      console.error("Error sending message:", error);
      alert(error.response?.data?.error || "Message could not be sent. Please try again.");
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

  const fileURL = (p) => `https://user-chat-9luh.onrender.com${p}`;

  // ---- selection logic ----
  const toggleSelectMessage = (id) => {
    setSelectedMessages((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const deleteSelected = async (forEveryone = false) => {
    const chosen = msgs.filter(m => selectedMessages.includes(m._id));
    const allowed = forEveryone ? chosen.filter(m => String(m.sender?._id || m.sender) === userId) : chosen;
    if (!allowed.length) return;
    if (!window.confirm(forEveryone ? "Delete selected messages for everyone?" : "Delete selected messages for you?")) return;
    try {
      await Promise.all(allowed.map(m => deleteDirectMessage(m._id, forEveryone)));
      setMsgs(prev => forEveryone
        ? prev.map(m => allowed.some(x => x._id === m._id) ? { ...m, deletedForEveryone: true, text: "", file: null } : m)
        : prev.filter(m => !allowed.some(x => x._id === m._id)));
      setSelectedMessages([]);
    } catch (error) {
      console.error("Failed to delete selected messages:", error);
      alert(error.response?.data?.error || "Unable to delete selected messages.");
    }
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

  const visibleMessages = msgs.filter((message) => {
    const query = messageSearch.trim().toLowerCase();
    const matchesText = !query || String(message.text || "").toLowerCase().includes(query);
    const matchesDate = !searchDate || dayjs(message.createdAt).format("YYYY-MM-DD") === searchDate;
    const isMine = String(message.sender?._id || message.sender) === userId;
    const matchesSender = searchSender === "all" || (searchSender === "me" ? isMine : !isMine);
    const hasAttachment = !!message.file || !!message.fileType;
    const matchesKind = searchKind === "all" || (searchKind === "attachments" ? hasAttachment : !hasAttachment);
    return matchesText && matchesDate && matchesSender && matchesKind;
  });

  const ACCENT20 = "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))";
  const mineStyle = { background: "linear-gradient(135deg, #8065F5 0%, #6D50E8 100%)", color: "#FFFFFF" };
  const otherStyle = { background: "#FFFFFF", color: "#302B45", border: "1px solid #ECE8F7" };
  const headLeftStyle = { ...S.headLeft, fontSize: isMobile ? "0.8rem" : S.headLeft.fontSize };
  const headRightStyle = { ...S.headRight, fontSize: isMobile ? "0.7rem" : S.headRight.fontSize };

  return (
    <div style={{ ...S.win, width: isMobile ? "100%" : "auto" }}>
      <div style={{ ...S.head, background: ACCENT20, color: "var(--textMain)" }}>
        {isMobile && <button style={S.back} onClick={() => onBack()}>←</button>}
        <div style={headLeftStyle}>{peer.name || peer.username || peer.mobile || peer.email || "Chat"}</div>

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
          backgroundColor: "#FFFFFF", color: "#302B45", border: "1px solid #E8E2FA", boxShadow: "0 24px 70px rgba(45,35,90,.22)", fontFamily: "var(--font-ui)",
          padding: "20px", borderRadius: "10px", zIndex: 1000, textAlign: "center"
        }}>
          <p style={{ fontWeight: "bold", fontSize: isMobile ? "0.9rem" : "1rem", margin: "10px 0" }}>
            Are you sure you want to block this user?
          </p>
          <button style={{ backgroundColor: "#E85D75", color: "white", border: "none", padding: "8px 16px", margin: 5, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }} onClick={handleBlockUser}>
            Yes, Block
          </button>
          <button style={{ backgroundColor: "#8065F5", color: "white", border: "none", padding: "8px 16px", margin: 5, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }} onClick={() => setShowBlockDialog(false)}>
            Cancel
          </button>
        </div>
      )}

      {typing && <div style={S.typing}><i className="fas fa-pen-nib" style={S.icon} /> … typing</div>}

      <div style={{ display: "flex", justifyContent: "flex-end", padding: "6px 14px 0" }}><button type="button" onClick={() => setSearchOpen(v => !v)} style={{ border: 0, background: "transparent", color: "var(--primary)", cursor: "pointer", fontSize: 13 }}>⌕ Search messages</button></div>
      {searchOpen && <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "8px 14px", background: "rgba(255,255,255,.72)" }}><input aria-label="Search message text" placeholder="Search text…" value={messageSearch} onChange={e => setMessageSearch(e.target.value)} style={{ flex: "1 1 150px", minWidth: 0, border: "1px solid #ddd6ed", borderRadius: 9, padding: 8 }} /><input aria-label="Filter by date" type="date" value={searchDate} onChange={e => setSearchDate(e.target.value)} style={{ border: "1px solid #ddd6ed", borderRadius: 9, padding: 7 }} /><select aria-label="Filter by sender" value={searchSender} onChange={e => setSearchSender(e.target.value)} style={{ border: "1px solid #ddd6ed", borderRadius: 9, padding: 7 }}><option value="all">Everyone</option><option value="me">You</option><option value="them">Contact</option></select><select aria-label="Filter by type" value={searchKind} onChange={e => setSearchKind(e.target.value)} style={{ border: "1px solid #ddd6ed", borderRadius: 9, padding: 7 }}><option value="all">All messages</option><option value="attachments">Attachments</option><option value="text">Text only</option></select><button type="button" onClick={() => { setMessageSearch(""); setSearchDate(""); setSearchKind("all"); setSearchSender("all"); }} style={{ border: 0, background: "#eee9ff", borderRadius: 8, padding: "7px 10px", color: "#5d4ac5" }}>Clear</button></div>}

      {/* Message Flow */}
      <div ref={flowRef} style={S.flow} onScroll={handleScroll}>
        {visibleMessages.map((m) => {
          const mine = m.sender.toString() === userId;
          const selected = selectedMessages.includes(m._id);
          return (
            <motion.div
              key={m._id}
              style={{
                ...S.bubble,
                ...(mine ? mineStyle : otherStyle),
                alignSelf: mine ? "flex-end" : "flex-start",
                backgroundColor: selected ? "var(--primarySoft)" : (mine ? mineStyle.background : otherStyle.background),
                position: "relative",
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onTouchStart={isMobile ? () => { touchTimeout.current = setTimeout(() => setContextMessage(m), 550); } : undefined}
              onTouchMove={isMobile ? () => clearTimeout(touchTimeout.current) : undefined}
              onTouchEnd={isMobile ? () => clearTimeout(touchTimeout.current) : undefined}
              onContextMenu={(e) => { e.preventDefault(); setContextMessage(m); }}
              onClick={!isMobile ? (e) => { if (e.ctrlKey || e.metaKey) toggleSelectMessage(m._id); } : undefined}
            >
              {m.replyTo && <div style={S.replyQuote}><b>Replying to</b><div>{m.replyTo.text || "Message"}</div></div>}
              {m.text && <span style={{ textTransform: "none" }}>{linkifyText(m.text)}</span>}
              {m.pending && <small style={{ display: "inline-flex", alignItems: "center", gap: 6, marginLeft: 8, opacity: .7 }}><span className="sc-mini-loader" /> {m.file ? "Sending attachment" : "Sending"}</small>}
              {m.file && m.fileType === "image" && <img src={fileURL(m.file)} alt="sent" style={S.thumbnail} onClick={() => window.open(fileURL(m.file), "_blank")} />}
              {m.file && m.fileType === "video" && <video style={S.thumbnail} controls onClick={() => window.open(fileURL(m.file), "_blank")}><source src={fileURL(m.file)} type="video/mp4" /></video>}
              {m.file && (m.fileType === "audio" || m.mime?.startsWith("audio/")) && <audio controls style={S.audioPlayer}><source src={fileURL(m.file)} type={m.mime || "audio/webm"} /></audio>}
              {m.file && !["image", "video", "audio"].includes(m.fileType) && !m.mime?.startsWith("image/") && !m.mime?.startsWith("video/") && !m.mime?.startsWith("audio/") && <a href={fileURL(m.file)} target="_blank" rel="noopener noreferrer" download style={{ display: "inline-block", marginTop: 8, color: "var(--primary)" }}>📎 Download attachment</a>}
              <div style={{ fontSize: 10, opacity: 0.6, textAlign: "right", marginTop: 5 }}>
                {dayjs(m.createdAt).format("DD MMM, hh:mm A")}
              </div>
            </motion.div>
          );
        })}
        <div ref={bottom} />
      </div>

      {contextMessage && (
        <div style={S.contextBackdrop} onClick={() => setContextMessage(null)}>
          <div role="menu" style={S.contextMenu} onClick={(e) => e.stopPropagation()}>
            <button type="button" style={S.contextAction} onClick={() => { setReplyTo(contextMessage); setContextMessage(null); }}>↩ Reply</button>
            <button type="button" style={S.contextAction} onClick={() => { if (contextMessage.text) navigator.clipboard?.writeText(contextMessage.text).catch(() => {}); setContextMessage(null); }}>▢ Copy</button>
            <button type="button" style={S.contextAction} onClick={() => { toggleSelectMessage(contextMessage._id); setContextMessage(null); }}>✓ Select</button>
            <button type="button" style={S.contextAction} onClick={async () => { const m = contextMessage; setContextMessage(null); if (window.confirm("Delete this message for you?")) { await deleteDirectMessage(m._id, false); setMsgs(prev => prev.filter(x => x._id !== m._id)); } }}>Delete for me</button>
            {String(contextMessage.sender?._id || contextMessage.sender) === userId && <button type="button" style={S.contextAction} onClick={async () => { const m = contextMessage; setContextMessage(null); if (window.confirm("Delete this message for everyone?")) { await deleteDirectMessage(m._id, true); setMsgs(prev => prev.map(x => x._id === m._id ? { ...x, deletedForEveryone: true, text: "", file: null } : x)); } }}>Delete for everyone</button>}
            <button type="button" style={S.contextCancel} onClick={() => setContextMessage(null)}>Cancel</button>
          </div>
        </div>
      )}

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
          backgroundColor: "#302B45", color: "white", display: "flex",
          justifyContent: "space-around", padding: "8px 0", zIndex: 100
        }}>
          <button onClick={copySelected} style={S.toolbarButton}>📋 Copy</button>
          <button onClick={shareSelected} style={S.toolbarButton}>📤 Share</button>
          <button onClick={() => setShowForwardPicker(true)} style={S.toolbarButton}>↗ Forward</button>
          <button onClick={() => deleteSelected(false)} style={S.toolbarButton}>Delete for me</button>
          <button onClick={() => deleteSelected(true)} style={S.toolbarButton}>Delete for everyone</button>
          <button onClick={() => setSelectedMessages([])} style={S.toolbarButton}>❌ Cancel</button>
        </div>
      )}

      {showForwardPicker && <ForwardPicker messageIds={selectedMessages.filter((id) => !String(id).startsWith("pending-"))} onClose={(sent) => { setShowForwardPicker(false); if (sent) setSelectedMessages([]); }} />}
      {replyTo && <div style={S.replyComposer}><span><b>Replying to:</b> {replyTo.text || "Attachment"}</span><button type="button" onClick={() => setReplyTo(null)}>×</button></div>}
      <MessageInput
        onSend={send}
        onTyping={() => { socket.emit("typing", { from: userId, to: peerId }); clearTimeout(typingTimeout.current); typingTimeout.current = setTimeout(() => socket.emit("typing:stop", { from: userId, to: peerId }), 1200); }}
        disabled={isUserBlocked}
        placeholder={isUserBlocked ? "This user is blocked" : "Type a message"}
      />
    </div>
  );
}

const S = {
  win: { flex: 1, display: "flex", flexDirection: "column", background: "#F8F7FC", height: "100%", overflow: "hidden", fontFamily: "var(--font-ui)" },
  head: { minHeight: 72, padding: "12px 22px", fontWeight: 700, display: "flex", alignItems: "center", gap: 12, background: "linear-gradient(110deg, #F1EDFF 0%, #FFFFFF 72%)", borderBottom: "1px solid #EAE5F6", boxShadow: "0 3px 16px rgba(55,42,110,.045)" },
  back: { border: "none", background: "transparent", fontSize: "1.6rem", cursor: "pointer", lineHeight: 1, color: "var(--textMain)" },
  headLeft: { fontSize: "clamp(1rem, 2.5vw, 1.25rem)", flex: 1 },
  headRight: { fontSize: "clamp(0.85rem, 2.2vw, 1rem)" },
  typing: { padding: "2px 20px", fontSize: "clamp(0.9rem, 2.3vw, 1rem)", color: "var(--primary)", marginBottom: 8 },
  icon: { marginRight: 4, fontSize: 14 },
  flow: { flex: 1, minHeight: 0, padding: "22px clamp(14px, 3vw, 34px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, scrollbarWidth: "none", msOverflowStyle: "none", background: "radial-gradient(circle at 18% 22%, rgba(128,101,245,.06) 0 2px, transparent 2.5px), radial-gradient(circle at 78% 68%, rgba(128,101,245,.045) 0 2px, transparent 2.5px), #FAF9FD", backgroundSize: "34px 34px, 42px 42px, auto" },
  bubble: { maxWidth: "min(76%, 680px)", padding: "11px 15px", borderRadius: 18, wordBreak: "break-word", boxShadow: "0 5px 16px rgba(50,40,100,.075)", position: "relative", cursor: "pointer" },
  thumbnail: { maxWidth: 220, maxHeight: 220, borderRadius: 10, marginTop: 8, cursor: "zoom-in" },
  audioPlayer: { width: 220, marginTop: 8 },
  toolbarButton: { background: "transparent", color: "white", border: "none", fontSize: 16, cursor: "pointer", padding: "4px 12px" },
  contextBackdrop: { position: "fixed", inset: 0, zIndex: 20000, background: "rgba(8,12,22,.38)", display: "flex", alignItems: "center", justifyContent: "center", padding: 18 },
  contextMenu: { width: "min(300px, 92vw)", background: "#fff", color: "#202938", borderRadius: 16, padding: 8, boxShadow: "0 18px 55px rgba(0,0,0,.25)", display: "flex", flexDirection: "column" },
  contextAction: { border: 0, background: "transparent", color: "inherit", textAlign: "left", padding: "13px 14px", borderRadius: 9, fontSize: 14, cursor: "pointer" },
  contextCancel: { border: 0, background: "#f2f3f6", color: "#202938", padding: "11px", borderRadius: 9, marginTop: 5, cursor: "pointer" },
  replyQuote: { borderLeft: "3px solid var(--primary)", background: "rgba(0,0,0,.07)", borderRadius: 6, padding: "6px 9px", marginBottom: 7, fontSize: 12 },
  replyComposer: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "8px 14px", background: "#eee9ff", color: "#302b45", fontSize: 13 },
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

//   const fileURL = (p) => `https://user-chat-9luh.onrender.com${p}`;

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
//           backgroundColor: "#FFFFFF", color: "#302B45", border: "1px solid #E8E2FA", boxShadow: "0 24px 70px rgba(45,35,90,.22)", fontFamily: "var(--font-ui)",
//           padding: "20px", borderRadius: "10px", zIndex: 1000, textAlign: "center"
//         }}>
//           <p style={{ fontWeight: "bold", fontSize: isMobile ? "0.9rem" : "1rem", margin: "10px 0" }}>
//             Are you sure you want to block this user?
//           </p>
//           <button style={{ backgroundColor: "#E85D75", color: "white", border: "none", padding: "8px 16px", margin: 5, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }} onClick={handleBlockUser}>
//             Yes, Block
//           </button>
//           <button style={{ backgroundColor: "#8065F5", color: "white", border: "none", padding: "8px 16px", margin: 5, borderRadius: 4, cursor: "pointer", fontWeight: "bold" }} onClick={() => setShowBlockDialog(false)}>
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
//           backgroundColor: "#302B45", color: "white", display: "flex",
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
//   win: { flex: 1, display: "flex", flexDirection: "column", background: "#F8F7FC", height: "100%", overflow: "hidden", fontFamily: "var(--font-ui)" },
//   head: { padding: "16px 20px", fontWeight: 700, display: "flex", alignItems: "center", gap: 12 },
//   back: { border: "none", background: "transparent", fontSize: "1.6rem", cursor: "pointer", lineHeight: 1, color: "var(--textMain)" },
//   headLeft: { fontSize: "clamp(1rem, 2.5vw, 1.25rem)", flex: 1 },
//   headRight: { fontSize: "clamp(0.85rem, 2.2vw, 1rem)" },
//   typing: { padding: "2px 20px", fontSize: "clamp(0.9rem, 2.3vw, 1rem)", color: "var(--primary)", marginBottom: 8 },
//   icon: { marginRight: 4, fontSize: 14 },
//   flow: { flex: 1, minHeight: 0, padding: "24px clamp(14px, 4vw, 42px)", overflowY: "auto", display: "flex", flexDirection: "column", gap: 12, scrollbarWidth: "none", msOverflowStyle: "none", background: "radial-gradient(circle at 18% 22%, rgba(128,101,245,.06) 0 2px, transparent 2.5px), radial-gradient(circle at 78% 68%, rgba(128,101,245,.045) 0 2px, transparent 2.5px), #FAF9FD", backgroundSize: "34px 34px, 42px 42px, auto" },
//   bubble: { maxWidth: "min(72%, 560px)", padding: "11px 15px", borderRadius: 18, wordBreak: "break-word", boxShadow: "0 2px 8px rgba(30,25,70,.06)", position: "relative", cursor: "pointer", lineHeight: 1.5 },
//   thumbnail: { maxWidth: 220, maxHeight: 220, borderRadius: 10, marginTop: 8, cursor: "zoom-in" },
//   audioPlayer: { width: 220, marginTop: 8 },
//   toolbarButton: { background: "transparent", color: "white", border: "none", fontSize: 16, cursor: "pointer", padding: "4px 12px" },
// };

