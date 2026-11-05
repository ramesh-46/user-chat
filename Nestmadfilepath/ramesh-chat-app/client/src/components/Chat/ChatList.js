import React, { useEffect, useMemo, useState, useContext } from "react";
import { fetchChatList, findUser } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";

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

const formatTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  if (sameDay) return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString([], { day: "numeric", month: "short" });
};

export default function ChatList({ current, onPick, socket, refreshKey = 0, markAllReadKey = 0, onOpenGroups }) {
  const { user } = useContext(AuthContext);
  const userId = String(user?._id || user?.userId || "");
  const isMobile = useIsMobile();
  const cacheKey = "chatlist:" + userId;

  const [peers, setPeers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(cacheKey) || "[]"); } catch (_) { return []; }
  });
  const [loading, setLoading] = useState(peers.length === 0);
  const [filter, setFilter] = useState("all"); // all | unread | groups
  const [contactImporting, setContactImporting] = useState(false);
  const [contactImportMessage, setContactImportMessage] = useState("");

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

  useEffect(() => { load(); }, [userId, refreshKey]);

  // "Mark all as read" from the header menu: clears unread badges locally.
  useEffect(() => {
    if (markAllReadKey > 0) setPeers((items) => items.map((p) => ({ ...p, unreadCount: 0 })));
  }, [markAllReadKey]);

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

  const savedNames = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("savedChatContactNames:" + userId) || "{}"); } catch (_) { return {}; }
  }, [userId, contactImporting]);

  const orderedPeers = useMemo(() => [...peers].sort((a, b) =>
    new Date(b.lastMessageAt || 0).getTime() - new Date(a.lastMessageAt || 0).getTime()
  ), [peers]);

  const filtered = useMemo(() => {
    if (filter === "unread") return orderedPeers.filter((p) => Number(p.unreadCount || 0) > 0);
    if (filter === "groups") return orderedPeers.filter((p) => p.isGroup || p.group);
    return orderedPeers;
  }, [orderedPeers, filter]);

  const handlePick = (peer) => {
    setPeers((items) => items.map((item) => String(item._id) === String(peer._id) ? { ...item, unreadCount: 0 } : item));
    onPick(peer);
  };

  const FILTERS = [
    { key: "all", label: "All" },
    { key: "unread", label: "Unread" },
    { key: "groups", label: "Groups" },
  ];

  return (
    <div style={{ ...styles.wrap, width: isMobile ? "100%" : "100%", display: "flex" }}>
      {/* Filter chips */}
      <div style={styles.filters} role="tablist" aria-label="Chat filters">
        {FILTERS.map((f) => (
          <button key={f.key} type="button" role="tab" aria-selected={filter === f.key}
            onClick={() => { if (f.key === "groups" && onOpenGroups) { setFilter("all"); onOpenGroups(); } else setFilter(f.key); }}
            style={{ ...styles.chip, ...(filter === f.key ? styles.chipActive : {}) }}>
            {f.label}
            {f.key === "unread" && orderedPeers.some((p) => Number(p.unreadCount || 0) > 0) && (
              <span style={styles.chipCount}>{orderedPeers.filter((p) => Number(p.unreadCount || 0) > 0).length}</span>
            )}
          </button>
        ))}
        <button type="button" title="Import phone contacts" onClick={importPhoneContacts}
          disabled={contactImporting} style={styles.importBtn}>
          {contactImporting ? "…" : "＋ Contacts"}
        </button>
      </div>

      {contactImportMessage && <div role="status" style={styles.contactHint}>{contactImportMessage}</div>}

      <div style={styles.list}>
        {loading && filtered.length === 0 && <div style={styles.empty}>Loading your chats…</div>}
        {!loading && filtered.length === 0 && (
          <div style={styles.empty}>
            {filter === "unread" ? "No unread messages 🎉" : filter === "groups" ? "No group conversations yet." : "No conversations yet. Search for someone to start chatting."}
          </div>
        )}
        {filtered.map((peer) => {
          const selected = String(current?._id) === String(peer._id);
          const unread = Number(peer.unreadCount || 0);
          const displayName = savedNames[String(peer._id)] || peer.contactName || peer.name || peer.username || peer.email || peer.mobile || "User";
          const preview = peer.lastText || (peer.lastFileType ? "📎 Attachment" : "Start a conversation");
          const avatarUrl = peer.profileImage || peer.profilePic || peer.avatar?.url;
          const time = formatTime(peer.lastMessageAt);
          return (
            <button type="button" key={peer._id} onClick={() => handlePick(peer)}
              style={{ ...styles.item, ...(selected ? styles.itemSelected : {}) }}>
              <div style={styles.avatarWrap}>
                {avatarUrl
                  ? <img src={avatarUrl} alt="" style={styles.avatarImg} />
                  : <div style={styles.avatarFallback}>{initials(peer)}</div>}
                {peer.online && <span style={styles.onlineDot} title="Online" />}
              </div>
              <div style={styles.itemBody}>
                <div style={styles.itemRow}>
                  <span style={styles.itemName}>{displayName}</span>
                  <span style={styles.itemTime}>{time}</span>
                </div>
                <div style={styles.itemRow}>
                  <span style={{ ...styles.itemPreview, ...(unread > 0 ? styles.itemPreviewUnread : {}) }}>{preview}</span>
                  {unread > 0 && <span style={styles.badge}>{unread > 99 ? "99+" : unread}</span>}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

const styles = {
  wrap: { flex: 1, minHeight: 0, flexDirection: "column", overflow: "hidden" },
  filters: { display: "flex", alignItems: "center", gap: 7, padding: "12px 16px", flexShrink: 0, borderBottom: "1px solid var(--border)", overflowX: "auto", scrollbarWidth: "none" },
  chip: {
    border: "1px solid var(--border)", borderRadius: 999, padding: "8px 15px", fontSize: 12,
    background: "var(--surface)", color: "var(--textLight)", fontWeight: 600, transition: "all .2s ease", cursor: "pointer",
  },
  chipActive: { background: "var(--primary)", borderColor: "var(--primary)", color: "#fff" },
  chipCount: {
    marginLeft: 6, background: "rgba(255,255,255,.25)", borderRadius: 999, padding: "1px 6px", fontSize: 11,
  },
  importBtn: {
    marginLeft: "auto", border: "1px solid var(--border)", borderRadius: 999, padding: "7px 12px",
    background: "var(--surface)", color: "var(--textMain)", fontSize: 12, fontWeight: 600, cursor: "pointer",
  },
  contactHint: { padding: "8px 16px", fontSize: 12, color: "var(--textLight)", background: "var(--chatSelected)", flexShrink: 0 },
  list: { flex: 1, minHeight: 0, overflowY: "auto", overscrollBehavior: "contain", padding: "9px 10px 18px" },
  item: {
    display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "left",
    padding: "12px 11px", border: "1px solid transparent", borderRadius: 16, background: "transparent",
    transition: "background .2s ease", cursor: "pointer", minWidth: 0,
  },
  itemSelected: { background: "var(--chatSelected)", borderColor: "var(--border)" },
  avatarWrap: { position: "relative", width: 50, height: 50, flexShrink: 0 },
  avatarImg: { width: 50, height: 50, borderRadius: "50%", objectFit: "cover" },
  avatarFallback: {
    width: 50, height: 50, borderRadius: "50%", display: "grid", placeItems: "center",
    background: "var(--chatSelected)", color: "var(--primary)", fontWeight: 700, fontSize: 16,
  },
  onlineDot: {
    position: "absolute", right: 0, bottom: 0, width: 12, height: 12, borderRadius: "50%",
    background: "var(--success, #35C77A)", border: "2px solid var(--surface)",
  },
  itemBody: { flex: 1, minWidth: 0 },
  itemRow: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 },
  itemName: { fontWeight: 650, fontSize: 14, color: "var(--textMain)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  itemTime: { fontSize: 11, color: "var(--textLight)", flexShrink: 0 },
  itemPreview: {
    fontSize: 12, color: "var(--textLight)", whiteSpace: "nowrap",
    overflow: "hidden", textOverflow: "ellipsis", minWidth: 0,
  },
  itemPreviewUnread: { color: "var(--textMain)", fontWeight: 600 },
  badge: {
    flexShrink: 0, background: "var(--primary)", color: "#fff", borderRadius: 999,
    fontSize: 11, fontWeight: 700, padding: "2px 7px", minWidth: 20, textAlign: "center",
  },
  empty: { padding: "28px 18px", textAlign: "center", color: "var(--textLight)", fontSize: 13 },
};