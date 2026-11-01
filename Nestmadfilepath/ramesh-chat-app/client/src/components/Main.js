import React, { useState, useContext, useEffect } from "react";
import { AnimatePresence } from "framer-motion";

import { AuthContext } from "../contexts/AuthContext";
import { ThemeContext } from "../contexts/ThemeContext";

import SearchBar from "./SearchBar";
import ChatList from "./Chat/ChatList";
import ChatWindow from "./Chat/ChatWindow";
import GroupChat from "./Chat/GroupChat";
import Navbar from "./Navbar";
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

export default function Main() {
  const { user, logout } = useContext(AuthContext);
  const { theme, themeKey, setTheme } = useContext(ThemeContext);

  const [current, setCurrent] = useState(() => {
    try { return JSON.parse(localStorage.getItem("lastOpenChat") || "null"); } catch (_) { return null; }
  });
  const [showProfile, setShowProfile] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(typeof Notification !== "undefined" && Notification.permission === "granted");
  const [customColor, setCustomColor] = useState(() => localStorage.getItem("chatCustomAccent") || "#7657d5");
  const isMobile = useIsMobile();

  useEffect(() => {
    if (current?._id) localStorage.setItem("lastOpenChat", JSON.stringify(current));
    else localStorage.removeItem("lastOpenChat");
  }, [current]);

  useEffect(() => {
    if (!/^#[0-9a-f]{6}$/i.test(customColor)) return;
    const root = document.documentElement;
    root.style.setProperty("--primary", customColor);
    root.style.setProperty("--primarySoft", `color-mix(in srgb, ${customColor} 17%, #ffffff)`);
    root.style.setProperty("--primaryGradient", `linear-gradient(135deg, ${customColor}, color-mix(in srgb, ${customColor} 55%, #111827))`);
    localStorage.setItem("chatCustomAccent", customColor);
  }, [customColor]);

  // AuthContext stores the Mongo user document. Older sessions may contain
  // userId instead of _id, so support both without changing the login flow.
  const userId = String(user?._id || user?.userId || "");

  // Join after every successful socket connection, including reconnects.
  useEffect(() => {
    if (!userId) return;

    const joinUserRoom = () => {
      socket.emit("join", userId);
    };

    if (socket.connected) joinUserRoom();
    socket.on("connect", joinUserRoom);

    return () => {
      socket.off("connect", joinUserRoom);
    };
  }, [userId]);

  // Notifications are opt-in: never trigger a permission prompt merely by
  // opening the app or a chat.
  useEffect(() => {
    if (!userId) return;

    const handleNotification = (message) => {
      const senderId = String(message?.sender?._id || message?.sender || "");
      if (
        document.hidden &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted" &&
        senderId !== userId
      ) {
        new Notification("New message", {
          body: message.text || (message.file ? "Attachment 📎" : "New message"),
        });
      }
    };

    socket.on("receiveMessage", handleNotification);
    return () => socket.off("receiveMessage", handleNotification);
  }, [userId]);

  return (
    <div style={S.wrap}>
      {(!isMobile || (!current && !showGroups)) && (
        <Navbar
          logout={logout}
          onProfile={() => setShowProfile(true)}
          onGroups={() => { setCurrent(null); setShowGroups(true); }}
          onSettings={() => setShowSettings(true)}
        />
      )}

      {(!isMobile || (!current && !showGroups)) && (
        <div style={S.searchRow}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <SearchBar
              onFound={(peer) => {
                setShowGroups(false);
                setCurrent(peer);
              }}
            />
          </div>
          <button
            onClick={() => {
              setCurrent(null);
              setShowGroups((value) => !value);
            }}
            style={S.groupsButton}
          >
            Groups
          </button>
        </div>
      )}

      <div style={S.body}>
        {showGroups ? (
          <GroupChat onBack={() => setShowGroups(false)} />
        ) : (
          <>
            <ChatList
              current={current}
              onPick={setCurrent}
              socket={socket}
            />
            {current ? (
              <ChatWindow
                peer={current}
                socket={socket}
                onBack={() => setCurrent(null)}
              />
            ) : null}
          </>
        )}
      </div>

      <CallButton peer={current} />
      <AnimatePresence>
        {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
      </AnimatePresence>
      {showSettings && (
        <div style={S.settingsBackdrop} onClick={() => setShowSettings(false)}>
          <section role="dialog" aria-modal="true" aria-label="Chat settings" style={S.settingsPanel} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ margin: 0 }}>Settings</h3>
              <button style={S.settingsClose} onClick={() => setShowSettings(false)}>✕</button>
            </div>
            <p>Appearance</p>
            <select value={themeKey} onChange={(event) => setTheme(event.target.value)} style={S.settingsSelect}>
              {Object.entries(THEMES).map(([key, item]) => <option key={key} value={key}>{item.name || key}</option>)}
            </select>
            <p style={{ marginBottom: 7 }}>Custom theme colour</p>
            <div style={{ display: "flex", gap: 9, alignItems: "center" }}>
              <input aria-label="Choose theme colour" type="color" value={customColor} onChange={(event) => setCustomColor(event.target.value)} style={{ width: 52, height: 42, padding: 2, border: "1px solid var(--border)", borderRadius: 9, background: "var(--surface)" }}/>
              <input aria-label="Theme hex colour" value={customColor} onChange={(event) => { const value = event.target.value; setCustomColor(value); }} placeholder="#7657d5" style={{ ...S.settingsSelect, margin: 0, flex: 1 }}/>
              <button type="button" onClick={() => setCustomColor("#7657d5")} style={{ ...S.settingsClose, fontSize: 12 }}>Reset</button>
            </div>
            <div style={{ height: 30, borderRadius: 9, marginTop: 10, background: "var(--primaryGradient, var(--primary))" }} />
            <p>Notifications</p>
            <button style={S.settingsAction} onClick={async () => {
              if (typeof Notification === "undefined") return alert("Notifications are not supported in this browser.");
              const permission = await Notification.requestPermission();
              setNotificationsEnabled(permission === "granted");
            }}>{notificationsEnabled ? "Notifications enabled" : "Enable notifications"}</button>
            <button style={S.settingsAction} onClick={() => { setShowSettings(false); setShowProfile(true); }}>My Account</button>
            <button style={{ ...S.settingsAction, background: "#a33" }} onClick={logout}>Log out</button>
          </section>
        </div>
      )}
    </div>
  );
}

const S = {
  wrap: {
    height: "100dvh",
    minHeight: 0,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
    background: "var(--primarySoft)",
    fontFamily: "var(--font-ui)",
    color: "var(--textMain)",
  },
  searchRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    flexShrink: 0,
    padding: "4px 8px",
  },
  groupsButton: {
    border: 0,
    borderRadius: 8,
    padding: "9px 12px",
    background: "var(--primary)",
    color: "white",
    cursor: "pointer",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    display: "flex",
    minHeight: 0,
    overflow: "hidden",
  },
  settingsBackdrop: { position: "fixed", inset: 0, zIndex: 5000, background: "rgba(0,0,0,.55)", display: "grid", placeItems: "center", padding: 16 },
  settingsPanel: { width: "min(360px, 100%)", background: "var(--surfaceAlt)", color: "var(--textMain)", border: "1px solid var(--border)", borderRadius: 16, padding: 20, boxShadow: "0 16px 50px rgba(0,0,0,.3)" },
  settingsClose: { border: 0, background: "transparent", color: "var(--textMain)", fontSize: 20, cursor: "pointer" },
  settingsSelect: { width: "100%", padding: 10, borderRadius: 8, marginBottom: 12, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--textMain)" },
  settingsAction: { width: "100%", border: 0, borderRadius: 8, padding: 11, marginTop: 8, background: "var(--primary)", color: "#fff", cursor: "pointer" },
  welcome: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--textLight)",
    fontSize: "clamp(1rem, 3vw, 1.3rem)",
    padding: 20,
    textAlign: "center",
  },
};
