import React, { useState, useContext, useEffect, useCallback } from "react";
import { AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";

import { AuthContext } from "../contexts/AuthContext";
import { ThemeContext } from "../contexts/ThemeContext";

import SearchBar from "./SearchBar";
import ChatList from "./Chat/ChatList";
import ChatWindow from "./Chat/ChatWindow";
import GroupChat from "./Chat/GroupChat";
import MeetingHub from "./Meetings/MeetingHub";
import FindPeople from "./People/FindPeople";
import ProfilePanel from "./Accounts/ProfilePanel";
import socket from "../socket";
import { THEMES } from "../themes";
import CallButton from "./Call/CallButton";
import { getFCMToken, auth } from "../firebase";
import { saveFCMToken, fetchChatList, declineMeetingInvite } from "../api";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 1024);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

const NAV_ITEMS = [
  { key: "chats", icon: "💬", label: "Chats" },
  { key: "groups", icon: "👥", label: "Groups" },
  { key: "meetings", icon: "▣", label: "Meetings" },
  { key: "contacts", icon: "👤", label: "Find people" },
];

export default function Main() {
  const { user, logout } = useContext(AuthContext);
  const { themeKey, theme, setTheme, customColor, setCustomColor } = useContext(ThemeContext);
  const navigate = useNavigate();

  const userId = String(user?._id || user?.userId || "");
  const isMobile = useIsMobile();

  const [current, setCurrent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lastOpenChat:" + String(user?._id || user?.userId || "guest")) || "null"); } catch (_) { return null; }
  });
  const [section, setSection] = useState("chats");          // chats | groups | meetings
  const [showProfile, setShowProfile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [markAllReadKey, setMarkAllReadKey] = useState(0);
  const [toasts, setToasts] = useState([]);
  const navigationRef = React.useRef({});
  navigationRef.current = { current, section, showProfile, showSettings, searchOpen };

  // Keep browser Back inside the current Sura Chat section instead of leaving the app.
  useEffect(() => {
    window.history.pushState({ suraChat: true }, "", window.location.href);
    const handleAppBack = () => {
      const nav = navigationRef.current;
      if (nav.showProfile) setShowProfile(false);
      else if (nav.showSettings) setShowSettings(false);
      else if (nav.searchOpen) setSearchOpen(false);
      else if (nav.current) setCurrent(null);
      else if (nav.section === "groups" || nav.section === "meetings" || nav.section === "findPeople") setSection("chats");
      else return;
      window.history.pushState({ suraChat: true }, "", window.location.href);
    };
    window.addEventListener("popstate", handleAppBack);
    return () => window.removeEventListener("popstate", handleAppBack);
  }, []);

  const [notificationsEnabled, setNotificationsEnabled] = useState(
    typeof Notification !== "undefined" && Notification.permission === "granted"
  );

  useEffect(() => {
    if (current?._id) localStorage.setItem("lastOpenChat:" + userId, JSON.stringify(current));
    else localStorage.removeItem("lastOpenChat:" + userId);
  }, [current]);

  // Join personal socket room after every connection, including reconnects.
  useEffect(() => {
    if (!userId) return;
    const joinUserRoom = () => socket.emit("join", userId);
    if (socket.connected) joinUserRoom();
    socket.on("connect", joinUserRoom);
    return () => socket.off("connect", joinUserRoom);
  }, [userId]);

  /* ---------- meeting notifications (knocks + invites) ---------- */
  const dismissToast = useCallback((id) => setToasts((list) => list.filter((t) => t.id !== id)), []);
  const pushToast = useCallback((toast) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((list) => [...list.slice(-3), { id, ...toast }]);
    setTimeout(() => dismissToast(id), toast.sticky ? 30000 : 8000);
    // Background browser notification when the tab is hidden.
    if (typeof Notification !== "undefined" && Notification.permission === "granted" && document.hidden) {
      try { new Notification(toast.title, { body: toast.body || "" }); } catch (_) {}
    }
    return id;
  }, [dismissToast]);

  useEffect(() => {
    if (!userId) return;
    const onKnock = ({ roomId, socketId, name } = {}) => {
      if (!roomId || !socketId) return;
      pushToast({
        kind: "knock", roomId, socketId,
        title: "🚪 " + (name || "Someone") + " is waiting",
        body: "Admit them into your meeting?", sticky: true,
      });
    };
    const onInvite = (data = {}) => {
      if (!data.inviteId) return;
      pushToast({
        kind: "invite", inviteId: data.inviteId, roomId: data.roomId,
        title: "📹 " + (data.from?.name || "Someone") + " invited you",
        body: data.title || "Sura Chat meeting", sticky: true,
      });
    };
    const onInviteAccepted = ({ name } = {}) => pushToast({ kind: "info", title: "✅ " + (name || "Someone") + " accepted your meeting invite" });
    const onInviteDeclined = ({ name } = {}) => pushToast({ kind: "info", title: "—" + (name || "Someone") + " declined your meeting invite" });
    socket.on("meeting:knock", onKnock);
    socket.on("meeting:invite", onInvite);
    socket.on("meeting:invite-accepted", onInviteAccepted);
    socket.on("meeting:invite-declined", onInviteDeclined);
    return () => {
      socket.off("meeting:knock", onKnock);
      socket.off("meeting:invite", onInvite);
      socket.off("meeting:invite-accepted", onInviteAccepted);
      socket.off("meeting:invite-declined", onInviteDeclined);
    };
  }, [userId, pushToast]);

  // New-message notifications — same toast style as admit/deny and invites.
  const seenRef = React.useRef({ currentPeerId: null, section: "chats" });
  seenRef.current = { currentPeerId: current?._id ? String(current._id) : null, section };
  useEffect(() => {
    if (!userId) return;
    const onDirect = (m = {}) => {
      const sender = String(m.sender?._id || m.sender || "");
      if (!sender || sender === userId || sender === seenRef.current.currentPeerId) return;
      const name = m.sender?.name || m.sender?.username || "New message";
      pushToast({ kind: "info", title: "💬 " + name, body: String(m.text || "📎 Attachment").slice(0, 90) });
    };
    const onGroup = (m = {}) => {
      const sender = String(m.sender?._id || m.sender || "");
      if (!sender || sender === userId || seenRef.current.section === "groups") return;
      pushToast({ kind: "info", title: "👥 " + (m.sender?.username || "Group"), body: String(m.text || "📎 Attachment").slice(0, 90) });
    };
    socket.on("receiveMessage", onDirect);
    socket.on("group:message", onGroup);
    return () => { socket.off("receiveMessage", onDirect); socket.off("group:message", onGroup); };
  }, [userId, pushToast]);

  const admitKnock = async (toast, allow) => {
    try {
      const token = await auth.currentUser?.getIdToken();
      socket.emit("meeting:respond", { roomId: toast.roomId, target: toast.socketId, allow, token });
      pushToast({ kind: "info", title: allow ? "✅ Admitted" : "🚫 Denied" });
    } catch (_) {
      pushToast({ kind: "info", title: "Could not respond — open the meeting" });
    }
    dismissToast(toast.id);
  };

  const joinInvite = async (toast) => {
    dismissToast(toast.id);
    try {
      navigate("/meeting/" + toast.roomId);
    } catch (_) { /* fall back to the meetings page */ setSection("meetings"); }
  };

  const declineInviteToast = (toast) => {
    declineMeetingInvite(toast.inviteId).catch(() => {});
    dismissToast(toast.id);
  };

  // Refresh the device push token after sign-in when permission was previously granted.
  useEffect(() => {
    if (!userId || typeof Notification === "undefined" || Notification.permission !== "granted") return;
    let cancelled = false;
    getFCMToken(false).then((token) => {
      if (!cancelled && token) saveFCMToken(token).catch((error) => console.warn("[PUSH] Token sync failed:", error));
    });
    return () => { cancelled = true; };
  }, [userId]);

  // Open the sender conversation from a notification tap.
  useEffect(() => {
    if (!userId) return;
    const params = new URLSearchParams(window.location.search);
    const senderId = params.get("openChat");
    const groupId = params.get("openGroup");
    if (groupId) setSection("groups");
    if (!senderId) return;
    let cancelled = false;
    fetchChatList(userId).then((response) => {
      if (cancelled) return;
      const peers = response.data?.users || [];
      const peer = peers.find((item) => String(item._id) === String(senderId));
      if (peer) { setSection("chats"); setCurrent(peer); }
    }).catch((error) => console.warn("[PUSH] Could not open notified conversation:", error));
    params.delete("openChat"); params.delete("openGroup");
    const query = params.toString();
    window.history.replaceState(window.history.state, "", window.location.pathname + (query ? "?" + query : "") + window.location.hash);
    return () => { cancelled = true; };
  }, [userId]);

  const showListOnly = !isMobile || (!current && section !== "groups-mobile");
  const openGroups = () => { setCurrent(null); setSection("groups"); };
  const openChats = () => { setSection("chats"); };
  const openFindPeople = () => { setCurrent(null); setSection("findPeople"); };

  const menuItem = (label, onClick) => (
    <button type="button" style={S.menuItem} onClick={() => { setListMenuOpen(false); setFabOpen(false); onClick(); }}>{label}</button>
  );

  return (
    <div style={{ ...S.shell, gridTemplateColumns: isMobile ? "minmax(0, 1fr)" : "76px minmax(300px, 380px) minmax(0, 1fr)" }}>
      {/* LEFT – icon navigation sidebar (desktop) */}
      {!isMobile && (
        <aside style={S.navbar} aria-label="Main navigation">
          <div style={S.logo} title="Black Pearl Chat">◆</div>
          {NAV_ITEMS.map((item) => {
            const active = (item.key === "groups" && section === "groups") || (item.key === "chats" && section === "chats") || (item.key === "meetings" && section === "meetings") || (item.key === "contacts" && section === "findPeople");
            return (
              <button key={item.key} type="button" title={item.label} aria-label={item.label}
                style={{ ...S.navBtn, ...(active ? S.navBtnActive : {}) }}
                onClick={() => {
                  if (item.key === "chats") openChats();
                  else if (item.key === "groups") openGroups();
                  else if (item.key === "meetings") { setCurrent(null); setSection("meetings"); }
                  else if (item.key === "contacts") openFindPeople();
                  else { setSearchOpen(true); openChats(); }
                }}>
                {item.icon}
              </button>
            );
          })}
          <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
            <button type="button" title="Settings" aria-label="Settings" style={S.navBtn} onClick={() => setShowSettings(true)}>⚙</button>
            <button type="button" title="My profile" aria-label="My profile" style={S.navBtn} onClick={() => setShowProfile(true)}>
              <span style={S.navAvatar}>{(user?.name || user?.username || "U").trim()[0]?.toUpperCase()}</span>
            </button>
          </div>
        </aside>
      )}

      {/* MIDDLE – conversation list column */}
      {(!isMobile || !current) && section !== "groups" && section !== "meetings" && section !== "findPeople" && (
        <section style={{ ...S.listCol, display: (isMobile && current) ? "none" : "flex" }} aria-label="Conversations">
          <header style={S.listHeader}>
            <div>
              <h1 style={S.listTitle}>Chats</h1>
              <p style={S.listSub}>Your recent conversations</p>
            </div>
            <div style={{ position: "relative" }}>
              <button type="button" aria-label="Chat menu" style={S.iconBtn} onClick={() => setListMenuOpen(v => !v)}>⋮</button>
              {listMenuOpen && (
                <>
                  <div style={S.backdrop} onClick={() => setListMenuOpen(false)} />
                  <div style={S.dropdown} role="menu">
                    {menuItem("New chat", () => { openChats(); setSearchOpen(true); })}
                    {menuItem("Create group", openGroups)}
                    {menuItem("Meetings", () => { setCurrent(null); setSection("meetings"); })}
                    {menuItem("Find people", openFindPeople)}
                    {menuItem("Refresh chats", () => setRefreshKey(k => k + 1))}
                    {menuItem("Mark all as read", () => setMarkAllReadKey(k => k + 1))}
                    {menuItem("Chat settings", () => setShowSettings(true))}
                  </div>
                </>
              )}
            </div>
          </header>

          {searchOpen && (
            <div style={S.searchRow}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <SearchBar onFound={(peer) => { openChats(); setCurrent(peer); setSearchOpen(false); }} />
              </div>
              <button type="button" aria-label="Close search" onClick={() => setSearchOpen(false)} style={S.iconBtn}>✕</button>
            </div>
          )}

          <ChatList
            current={current}
            onPick={setCurrent}
            socket={socket}
            refreshKey={refreshKey}
            markAllReadKey={markAllReadKey}
            onOpenGroups={openGroups}
          />
        </section>
      )}

      {/* RIGHT – active conversation (desktop) */}
      {!isMobile && (
        <main style={{ ...S.convCol, ...(section === "groups" || section === "meetings" || section === "findPeople" ? { gridColumn: "2 / 4", width: "100%", minWidth: 0 } : {}) }} aria-label={section === "groups" ? "Group conversations" : section === "meetings" ? "Meetings" : section === "findPeople" ? "Find people" : "Conversation"}>
          {section === "findPeople" ? (
            <FindPeople onPick={(person) => { setCurrent(person); setSection("chats"); }} onBack={openChats} />
          ) : section === "groups" ? (
            <GroupChat onBack={openChats} />
          ) : section === "meetings" ? (
            <MeetingHub onBack={openChats} />
          ) : current ? (
            <ChatWindow peer={current} socket={socket} onBack={() => setCurrent(null)} />
          ) : (
            <div style={S.welcome}>
              <div style={S.welcomeBadge}>◆</div>
              <strong style={S.welcomeTitle}>Your conversations, all in one place</strong>
              <p style={S.welcomeText}>Select a chat to start messaging securely.</p>
            </div>
          )}
        </main>
      )}

      {isMobile && section === "findPeople" && <main style={S.convColMobile} aria-label="Find people"><FindPeople onPick={(person) => { setCurrent(person); setSection("chats"); }} onBack={openChats} /></main>}

      {/* Mobile: full-screen meetings */}
      {isMobile && section === "meetings" && (
        <main style={S.convColMobile} aria-label="Meetings"><MeetingHub onBack={openChats} /></main>
      )}

      {isMobile && section === "groups" && (
        <main style={S.convColMobile} aria-label="Group conversations">
          <GroupChat onBack={openChats} />
        </main>
      )}

      {/* Mobile: full-screen conversation */}
      {isMobile && current && section !== "groups" && section !== "meetings" && (
        <main style={S.convColMobile} aria-label="Conversation">
          <ChatWindow peer={current} socket={socket} onBack={() => setCurrent(null)} />
        </main>
      )}

      {/* Mobile floating (+) button */}
      {isMobile && !current && section === "chats" && (
        <div style={{ position: "fixed", right: 18, bottom: 24, zIndex: 900 }}>
          <AnimatePresence>
            {fabOpen && (
              <div style={S.fabMenu}>
                <button type="button" style={S.fabItem} onClick={() => { setFabOpen(false); setSearchOpen(true); }}>New chat</button>
                <button type="button" style={S.fabItem} onClick={() => { setFabOpen(false); openGroups(); }}>Create group</button>
                <button type="button" style={S.fabItem} onClick={() => { setFabOpen(false); setSection("meetings"); }}>Meetings</button>
                <button type="button" style={S.fabItem} onClick={() => { setFabOpen(false); openFindPeople(); }}>Find people</button>
              </div>
            )}
          </AnimatePresence>
          <button type="button" aria-label="New chat options" style={{ ...S.fab }} onClick={() => setFabOpen(v => !v)}>＋</button>
        </div>
      )}

      {/* Meeting notifications: knocks to admit, invites to join or decline */}
      <div style={S.toastStack} aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} style={S.toast}>
            <div style={{ minWidth: 0 }}>
              <b style={S.toastTitle}>{t.title}</b>
              {t.body && <div style={S.toastBody}>{t.body}</div>}
            </div>
            <div style={S.toastActions}>
              {t.kind === "knock" && <>
                <button style={{ ...S.toastBtn, background: "#28b879" }} onClick={() => admitKnock(t, true)}>Admit</button>
                <button style={{ ...S.toastBtn, background: "transparent", border: "1px solid var(--border)", color: "var(--textMain)" }} onClick={() => admitKnock(t, false)}>Deny</button>
              </>}
              {t.kind === "invite" && <>
                <button style={{ ...S.toastBtn, background: "var(--primary)" }} onClick={() => joinInvite(t)}>Join</button>
                <button style={{ ...S.toastBtn, background: "transparent", border: "1px solid var(--border)", color: "var(--textMain)" }} onClick={() => declineInviteToast(t)}>Decline</button>
              </>}
              <button style={S.toastX} aria-label="Dismiss" onClick={() => dismissToast(t.id)}>✕</button>
            </div>
          </div>
        ))}
      </div>

      <CallButton peer={current} />
      <AnimatePresence>
        {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      </AnimatePresence>

      {/* Settings dialog */}
      {showSettings && (
        <div style={S.settingsBackdrop} onClick={() => setShowSettings(false)}>
          <section role="dialog" aria-modal="true" aria-label="Chat settings" style={S.settingsPanel} onClick={(e) => e.stopPropagation()}>
            <div style={S.settingsHead}>
              <h3 style={{ margin: 0, fontSize: 17 }}>Settings</h3>
              <button style={S.iconBtn} onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <p style={S.settingsLabel}>Appearance</p>
            <select value={themeKey} onChange={(e) => setTheme(e.target.value)} style={S.settingsSelect}>
              {Object.entries(THEMES).map(([key, item]) => <option key={key} value={key}>{item.name || key}</option>)}
            </select>
            <label style={{ display: "block", margin: "10px 0 6px", fontSize: 13 }}>Your accent colour</label>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
              <input aria-label="Choose custom theme colour" type="color" value={customColor || "#8065F5"}
                onChange={(e) => setCustomColor(e.target.value)} style={S.colorInput} />
              <code style={{ color: "var(--textLight)" }}>{customColor || "#8065F5"}</code>
              <button type="button" onClick={() => setCustomColor("")} style={S.resetBtn}>Reset</button>
            </div>
            <p style={S.settingsLabel}>Notifications</p>
            <button style={S.settingsAction} onClick={async () => {
              if (typeof Notification === "undefined") return alert("Notifications are not supported in this browser.");
              const token = await getFCMToken(true);
              if (token) {
                await saveFCMToken(token);
                setNotificationsEnabled(true);
              } else {
                setNotificationsEnabled(Notification.permission === "granted");
                if (Notification.permission !== "granted") alert("Please allow notifications in browser settings, then try again.");
                else alert("Push notifications could not be registered on this browser.");
              }
            }}>{notificationsEnabled ? "Notifications enabled" : "Enable notifications"}</button>
            <button style={S.settingsAction} onClick={() => { setShowSettings(false); setShowProfile(true); }}>My Account</button>
            <button style={{ ...S.settingsAction, background: "#E5484D" }} onClick={logout}>Log out</button>
          </section>
        </div>
      )}
    </div>
  );
}

const S = {
  shell: {
    height: "100dvh", display: "grid", minHeight: 0, overflow: "hidden",
    background: "var(--primarySoft)", fontFamily: "var(--font-ui)", color: "var(--textMain)",
  },
  navbar: {
    display: "flex", flexDirection: "column", alignItems: "center", gap: 10, padding: "14px 0",
    background: "var(--surfaceAlt)", borderRight: "1px solid var(--border)", flexShrink: 0,
  },
  logo: { fontSize: 26, color: "var(--primary)", fontWeight: 800, marginBottom: 10 },
  navBtn: {
    width: 44, height: 44, border: 0, borderRadius: 14, fontSize: 19,
    background: "transparent", color: "var(--textLight)", display: "grid", placeItems: "center",
    transition: "all .2s ease",
  },
  navBtnActive: { background: "var(--primary)", color: "#fff", boxShadow: "var(--shadow-md)" },
  navAvatar: {
    width: 34, height: 34, borderRadius: "50%", background: "var(--chatSelected)", color: "var(--primary)",
    display: "grid", placeItems: "center", fontWeight: 700, fontSize: 15,
  },
  listCol: {
    flexDirection: "column", minHeight: 0, overflow: "hidden",
    background: "var(--surface)", borderRight: "1px solid var(--border)", position: "relative",
  },
  listHeader: {
    display: "flex", alignItems: "center", justifyContent: "space-between",
    padding: "16px 16px 10px", flexShrink: 0,
  },
  listTitle: { margin: 0, fontSize: 22, fontWeight: 700, color: "var(--textMain)" },
  listSub: { margin: "2px 0 0", fontSize: 12, color: "var(--textLight)" },
  iconBtn: {
    width: 38, height: 38, border: 0, borderRadius: 12, fontSize: 17, cursor: "pointer",
    background: "var(--chatSelected)", color: "var(--textMain)", display: "grid", placeItems: "center",
    transition: "all .2s ease",
  },
  backdrop: { position: "fixed", inset: 0, zIndex: 1000 },
  dropdown: {
    position: "absolute", right: 0, top: 44, zIndex: 1001, minWidth: 190,
    background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14,
    boxShadow: "var(--shadow-lg)", padding: 6, display: "flex", flexDirection: "column",
  },
  menuItem: {
    border: 0, background: "transparent", color: "var(--textMain)", textAlign: "left",
    padding: "10px 12px", borderRadius: 10, fontSize: 14, transition: "background .2s ease", cursor: "pointer",
  },
  searchRow: {
    display: "flex", alignItems: "center", gap: 8, padding: "4px 14px 12px",
    borderBottom: "1px solid var(--border)", flexShrink: 0,
  },
  convCol: { display: "flex", minHeight: 0, overflow: "hidden", background: "var(--surface)" },
  convColMobile: {
    position: "fixed", inset: 0, zIndex: 800, display: "flex",
    minHeight: 0, background: "var(--surface)",
    paddingBottom: "env(safe-area-inset-bottom)",
  },
  welcome: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4, textAlign: "center", padding: 24 },
  welcomeBadge: { fontSize: 40, color: "var(--primary)", marginBottom: 10 },
  welcomeTitle: { color: "var(--textMain)", fontSize: 19 },
  welcomeText: { color: "var(--textLight)", fontSize: 13, marginTop: 6 },
  fab: {
    width: 58, height: 58, borderRadius: "50%", border: 0, fontSize: 26,
    background: "var(--primary)", color: "#fff", boxShadow: "var(--shadow-lg)", display: "grid", placeItems: "center",
  },
  fabMenu: {
    position: "absolute", right: 0, bottom: 70, background: "var(--surface)", border: "1px solid var(--border)",
    borderRadius: 14, boxShadow: "var(--shadow-lg)", padding: 6, display: "flex", flexDirection: "column", minWidth: 170,
  },
  fabItem: {
    border: 0, background: "transparent", color: "var(--textMain)", textAlign: "left",
    padding: "11px 13px", borderRadius: 10, fontSize: 14, cursor: "pointer",
  },
  toastStack: { position: "fixed", top: 14, left: "50%", transform: "translateX(-50%)", zIndex: 9000, display: "flex", flexDirection: "column", gap: 10, width: "min(420px, calc(100% - 20px))" },
  toast: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, padding: "12px 14px", borderRadius: 14, background: "var(--surfaceAlt, #1d2a44)", color: "var(--textMain, #fff)", border: "1px solid var(--border)", boxShadow: "0 16px 44px rgba(0,0,0,.35)" },
  toastTitle: { fontSize: 13.5, display: "block" },
  toastBody: { fontSize: 12, color: "var(--textLight)", marginTop: 2 },
  toastActions: { display: "flex", gap: 6, flexShrink: 0, alignItems: "center" },
  toastBtn: { border: 0, borderRadius: 9, padding: "8px 12px", color: "#fff", fontWeight: 700, fontSize: 12.5, cursor: "pointer" },
  toastX: { border: 0, background: "transparent", color: "var(--textLight)", cursor: "pointer", fontSize: 13 },
  settingsBackdrop: { position: "fixed", inset: 0, zIndex: 5000, background: "rgba(36, 36, 50, .45)", display: "grid", placeItems: "center", padding: 16 },
  settingsPanel: {
    width: "min(360px, 100%)", background: "var(--surfaceAlt)", color: "var(--textMain)",
    border: "1px solid var(--border)", borderRadius: 18, padding: 20, boxShadow: "var(--shadow-lg)",
  },
  settingsHead: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  settingsLabel: { margin: "8px 0 6px", fontSize: 13, fontWeight: 600, color: "var(--textLight)" },
  settingsSelect: { width: "100%", padding: 10, borderRadius: 10, marginBottom: 6, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--textMain)" },
  colorInput: { width: 48, height: 38, border: "1px solid var(--border)", borderRadius: 10, background: "var(--surface)", cursor: "pointer" },
  resetBtn: { marginLeft: "auto", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--textMain)", borderRadius: 10, padding: "8px 12px", cursor: "pointer" },
  settingsAction: {
    width: "100%", border: 0, borderRadius: 12, padding: 12, marginTop: 8,
    background: "var(--primary)", color: "#fff", fontWeight: 600, fontSize: 14, cursor: "pointer",
  },
};
