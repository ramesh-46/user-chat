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
  const { theme } = useContext(ThemeContext);

  const [current, setCurrent] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showGroups, setShowGroups] = useState(false);
  const isMobile = useIsMobile();

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
            ) : (
              <div style={S.welcome}>
                Select or search a contact to start chatting
              </div>
            )}
          </>
        )}
      </div>

      <AnimatePresence>
        {showProfile && (
          <ProfilePanel onClose={() => setShowProfile(false)} />
        )}
      </AnimatePresence>
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
