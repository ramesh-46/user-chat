import React, { useState, useContext, useEffect } from "react";
import { AnimatePresence } from "framer-motion";

import { AuthContext } from "../contexts/AuthContext";
import { ThemeContext } from "../contexts/ThemeContext";

import SearchBar from "./SearchBar";
import ChatList from "./Chat/ChatList";
import ChatWindow from "./Chat/ChatWindow";
import GroupChat from "./Chat/GroupChat";
import ProfilePanel from "./Accounts/ProfilePanel";
import socket from "../socket";
import { THEMES } from "../themes";
import CallButton from "./Call/CallButton";

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
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
  { key: "contacts", icon: "👤", label: "Contacts" },
];

export default function Main() {
  const { user, logout } = useContext(AuthContext);
  const { theme, themeKey, setTheme, customColor, setCustomColor } = useContext(ThemeContext);

  const userId = String(user?._id || user?.userId || "");
  const isMobile = useIsMobile();

  const [current, setCurrent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lastOpenChat:" + String(user?._id || user?.userId || "guest")) || "null"); } catch (_) { return null; }
  });
  const [section, setSection] = useState("chats");          // chats | groups
  const [showProfile, setShowProfile] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [listMenuOpen, setListMenuOpen] = useState(false);
  const [fabOpen, setFabOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [markAllReadKey, setMarkAllReadKey] = useState(0);
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

  // Opt-in desktop notifications (never auto-prompts).
  useEffect(() => {
    if (!userId) return;
    const handleNotification = (message) => {
      const senderId = String(message?.sender?._id || message?.sender || "");
      if (document.hidden && typeof Notification !== "undefined" &&
          Notification.permission === "granted" && senderId !== userId) {
        new Notification("New message", {
          body: message.text || (message.file ? "Attachment 📎" : "New message"),
        });
      }
    };
    socket.on("receiveMessage", handleNotification);
    return () => socket.off("receiveMessage", handleNotification);
  }, [userId]);

  const showListOnly = !isMobile || (!current && section !== "groups-mobile");
  const openGroups = () => { setCurrent(null); setSection("groups"); };
  const openChats = () => { setSection("chats"); };

  const menuItem = (label, onClick) => (
    <button type="button" style={S.menuItem} onClick={() => { setListMenuOpen(false); setFabOpen(false); onClick(); }}>{label}</button>
  );

  return (
    <div style={{ ...S.shell, gridTemplateColumns: isMobile ? "1fr" : "72px 352px 1fr" }}>
      {/* LEFT – icon navigation sidebar (desktop) */}
      {!isMobile && (
        <aside style={S.navbar} aria-label="Main navigation">
          <div style={S.logo} title="Black Pearl Chat">◆</div>
          {NAV_ITEMS.map((item) => {
            const active = (item.key === "groups" && section === "groups") || (item.key === "chats" && section === "chats");
            return (
              <button key={item.key} type="button" title={item.label} aria-label={item.label}
                style={{ ...S.navBtn, ...(active ? S.navBtnActive : {}) }}
                onClick={() => {
                  if (item.key === "chats") openChats();
                  else if (item.key === "groups") openGroups();
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
      {(!isMobile || !current) && section !== "groups" && (
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
        <main style={{ ...S.convCol, ...(section === "groups" ? { gridColumn: "2 / 4", width: "100%", minWidth: 0 } : {}) }} aria-label={section === "groups" ? "Group conversations" : "Conversation"}>
          {section === "groups" ? (
            <GroupChat onBack={openChats} />
          ) : current ? (
            <ChatWindow peer={current} socket={socket} onBack={() => setCurrent(null)} />
          ) : section === "groups" ? null : (
            <div style={S.welcome}>
              <div style={S.welcomeBadge}>◆</div>
              <strong style={S.welcomeTitle}>Your conversations, all in one place</strong>
              <p style={S.welcomeText}>Select a chat to start messaging securely.</p>
            </div>
          )}
        </main>
      )}

      {/* Mobile: full-screen group conversations */}
      {isMobile && section === "groups" && (
        <main style={S.convColMobile} aria-label="Group conversations">
          <GroupChat onBack={openChats} />
        </main>
      )}

      {/* Mobile: full-screen conversation */}
      {isMobile && current && section !== "groups" && (
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
              </div>
            )}
          </AnimatePresence>
          <button type="button" aria-label="New chat options" style={{ ...S.fab }} onClick={() => setFabOpen(v => !v)}>＋</button>
        </div>
      )}

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
              const permission = await Notification.requestPermission();
              setNotificationsEnabled(permission === "granted");
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