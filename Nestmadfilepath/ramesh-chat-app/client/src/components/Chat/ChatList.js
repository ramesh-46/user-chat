import React, { useEffect, useMemo, useState, useContext } from "react";
import { fetchChatList, findUser } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import { motion } from "framer-motion";

const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const resize = () => setMobile(window.innerWidth <= 768);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  return mobile;
};

const initials = (peer) => (peer?.name || peer?.username || peer?.email || "?")
  .trim().split(/[\s._-]+/).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");

export default function ChatList({ current, onPick, socket }) {
  const { user } = useContext(AuthContext);
  const userId = String(user?._id || user?.userId || "");
  const isMobile = useIsMobile();
  const cacheKey = "chatlist:" + userId;
  const [peers, setPeers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(cacheKey) || "[]"); } catch (_) { return []; }
  });
  const [loading, setLoading] = useState(peers.length === 0);\n  const [contactImporting, setContactImporting] = useState(false);\n  const [contactImportMessage, setContactImportMessage] = useState("");

  const load = async () => {
    if (!userId) return;
    try {
      const res = await fetchChatList(userId);
      const list = (res.data.users || []).sort((a, b) =>
        new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
      );
      setPeers(list);
      localStorage.setItem(cacheKey, JSON.stringify(list));
    } catch (error) {
      console.error("Chat list refresh failed:", error);
    } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [userId]);
  useEffect(() => {
    if (!socket) return;
    const refresh = () => load();
    socket.on("refreshConversations", refresh);
    socket.on("receiveMessage", refresh);
    const online = (payload) => {
      const id = String(payload?.userId || payload?._id || payload);
      setPeers((items) => items.map((peer) => String(peer._id) === id ? { ...peer, online: true, lastSeen: null } : peer));
    };
    const offline = (payload) => {
      const id = String(payload?.userId || payload);
      setPeers((items) => items.map((peer) => String(peer._id) === id ? { ...peer, online: false, lastSeen: payload?.lastSeen || new Date().toISOString() } : peer));
    };
    socket.on("userOnline", online);
    socket.on("userOffline", offline);
    return () => {
      socket.off("refreshConversations", refresh);
      socket.off("receiveMessage", refresh);
      socket.off("userOnline", online);
      socket.off("userOffline", offline);
    };
  }, [socket, userId]);

  const importPhoneContacts = async () => {
    if (!navigator.contacts?.select) {
      setContactImportMessage("Contact import is supported in some Android browsers. You can still search by username, email or phone.");
      return;
    }
    setContactImporting(true);
    setContactImportMessage("");
    try {
      const picked = await navigator.contacts.select(["name", "tel"], { multiple: true });
      const savedNames = JSON.parse(localStorage.getItem("savedChatContactNames:" + userId) || "{}");
      for (const contact of picked) {
        const phone = contact.tel?.[0]?.replace(/[^+0-9]/g, "");
        const displayName = contact.name?.[0];
        if (!phone || !displayName) continue;
        try {
          let found;
          try { found = await findUser(phone); } catch (_) {}
          if (!found?.data?.user?._id && phone.replace(/\D/g, "").length > 10) {
            found = await findUser(phone.replace(/\D/g, "").slice(-10));
          }
          if (found?.data?.user?._id) savedNames[String(found.data.user._id)] = displayName;
        } catch (_) {}
      }
      localStorage.setItem("savedChatContactNames:" + userId, JSON.stringify(savedNames));
      setPeers((items) => items.map((peer) => ({ ...peer, contactName: savedNames[String(peer._id)] || peer.contactName })));
      setContactImportMessage("Contacts matched with existing accounts.");
    } catch (error) {
      if (error.name !== "AbortError") setContactImportMessage("Unable to import contacts. Check browser contact access.");
    } finally { setContactImporting(false); }
  };

  const orderedPeers = useMemo(() => [...peers].sort((a, b) =>
    new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
  ), [peers]);

  const hidden = isMobile && !!current;
  const handlePick = (peer) => {
    setPeers((items) => items.map((item) => String(item._id) === String(peer._id) ? { ...item, unreadCount: 0 } : item));
    onPick(peer);
  };

  return (
    <aside style={{ ...styles.panel, width: isMobile ? "100%" : 340, display: hidden ? "none" : "flex" }}>
      <div style={styles.heading}>
        <div><strong style={styles.headingTitle}>Chats</strong><div style={styles.subheading}>Your recent conversations</div></div>
        <span style={styles.total}>{orderedPeers.length}</span>
      </div>
      {contactImportMessage && <div role="status" style={styles.contactHint}>{contactImportMessage}</div>}\n      <div style={styles.list}>
        {loading && orderedPeers.length === 0 && <div style={styles.empty}>Loading your chats…</div>}
        {!loading && orderedPeers.length === 0 && <div style={styles.empty}>No conversations yet. Search for someone to start chatting.</div>}
        {orderedPeers.map((peer) => {
          const selected = String(current?._id) === String(peer._id);
          const unread = Number(peer.unreadCount || 0);
          const savedNames = (() => { try { return JSON.parse(localStorage.getItem("savedChatContactNames:" + userId) || "{}"); } catch (_) { return {}; } })();\n          const displayName = savedNames[String(peer._id)] || peer.contactName || peer.name || peer.username || peer.email || peer.mobile || "User";
          const preview = peer.lastText || (peer.lastFileType ? "📎 Attachment" : "Start a conversation");
          return (
            <motion.button key={peer._id} type="button" onClick={() => handlePick(peer)}
              whileTap={{ scale: .985 }}
              style={{ ...styles.chat, background: selected ? "var(--chatSelected, color-mix(in srgb, var(--primary) 16%, var(--surfaceAlt)))" : "transparent" }}>
              <div style={styles.avatarWrap}>
                {peer.avatar ? <img src={peer.avatar} alt="" style={styles.avatar}/> : <div style={styles.avatarFallback}>{initials(peer)}</div>}
                <span title={peer.online ? "Online" : "Offline"} style={{ ...styles.presence, background: peer.online ? "#20c878" : "#9aa2ad" }}/>
              </div>
              <div style={styles.details}>
                <div style={styles.topline}>
                  <strong style={styles.name}>{displayName}</strong>
                  <span style={styles.time}>{peer.lastMessageAt ? new Date(peer.lastMessageAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}</span>
                </div>
                <div style={styles.bottomline}>
                  <span style={styles.preview}>{preview}</span>
                  {unread > 0 && !selected && <span style={styles.unread}>{unread > 99 ? "99+" : unread}</span>}
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>
    </aside>
  );
}

const styles = {
  panel: { flexShrink: 0, height: "100%", minHeight: 0, flexDirection: "column", overflow: "hidden", background: "var(--surfaceAlt)", borderRight: "1px solid var(--border)", boxSizing: "border-box", color: "var(--textMain)" },
  heading: { minHeight: 70, padding: "14px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid var(--border)", boxSizing: "border-box" },
  headingTitle: { fontSize: 22, letterSpacing: "-.4px" },
  subheading: { color: "var(--textLight)", fontSize: 12, marginTop: 3 },
  importButton: { border: "1px solid var(--border)", borderRadius: 18, padding: "6px 9px", background: "var(--surface)", color: "var(--textMain)", fontSize: 11, fontWeight: 700, cursor: "pointer" },\n  contactHint: { padding: "7px 14px", color: "var(--textLight)", fontSize: 11, background: "var(--surface)" },\n  total: { borderRadius: 20, padding: "4px 9px", background: "var(--primarySoft)", color: "var(--textMain)", fontSize: 12, fontWeight: 700 },
  list: { overflowY: "auto", flex: 1, minHeight: 0, padding: "4px 0" },
  empty: { textAlign: "center", padding: 32, color: "var(--textLight)", fontSize: 14 },
  chat: { width: "100%", minHeight: 78, display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", border: 0, borderBottom: "1px solid var(--border)", textAlign: "left", cursor: "pointer", color: "var(--textMain)", boxSizing: "border-box" },
  avatarWrap: { position: "relative", flexShrink: 0, width: 50, height: 50 },
  avatar: { width: 50, height: 50, borderRadius: "50%", objectFit: "cover" },
  avatarFallback: { width: 50, height: 50, borderRadius: "50%", display: "grid", placeItems: "center", background: "linear-gradient(135deg, var(--primary), var(--primarySoft))", color: "#fff", fontWeight: 800, fontSize: 17 },
  presence: { position: "absolute", width: 12, height: 12, borderRadius: "50%", right: 0, bottom: 1, border: "2px solid var(--surfaceAlt)" },
  details: { minWidth: 0, flex: 1 },
  topline: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  name: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 15, fontWeight: 700 },
  time: { color: "var(--textLight)", fontSize: 11, flexShrink: 0 },
  bottomline: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 6 },
  preview: { minWidth: 0, color: "var(--textLight)", fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  unread: { flexShrink: 0, minWidth: 20, height: 20, padding: "0 5px", borderRadius: 12, display: "grid", placeItems: "center", background: "#20b96b", color: "#fff", fontSize: 11, fontWeight: 800 },
};
