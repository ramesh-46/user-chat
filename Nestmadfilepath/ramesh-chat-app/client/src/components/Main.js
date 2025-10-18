// import React, { useState, useContext, useEffect } from "react";
// import io from "socket.io-client";
// import { AnimatePresence } from "framer-motion";

// import { AuthContext } from "../contexts/AuthContext";

// import SearchBar   from "./SearchBar";
// import ChatList    from "./Chat/ChatList";
// import ChatWindow  from "./Chat/ChatWindow";
// import Navbar      from "./Navbar";
// import ProfilePanel from "./Accounts/ProfilePanel";  // ← folder “Account” (singular)

// const socket = io("http://localhost:4000");   // backend port

// export default function Main() {
//   const { user, logout } = useContext(AuthContext);

//   const [current,    setCurrent]    = useState(null);
//   const [showProfile, setShowProfile] = useState(false);

//   /* join socket room */
//   useEffect(() => {
//     socket.emit("join", user.userId);
//   }, [user]);

//   /* desktop notifications (unchanged) */
//   useEffect(() => {
//     if (Notification.permission === "default") Notification.requestPermission();
//     socket.on("receiveMessage", m => {
//       if (
//         document.hidden &&
//         Notification.permission === "granted" &&
//         m.sender !== user.userId
//       ) {
//         new Notification("New message", { body: m.text || "Image 📷" });
//       }
//     });
//     return () => socket.off("receiveMessage");
//   }, [socket, user]);

//   return (
//     <div style={styles.wrap}>
//       <Navbar logout={logout} onProfile={() => setShowProfile(true)} />
//       <SearchBar onFound={setCurrent} />

//       <div style={styles.body}>
//         <ChatList current={current} onPick={setCurrent} socket={socket} />
//         {current ? (
//           <ChatWindow peer={current} socket={socket} />
//         ) : (
//           <div style={styles.welcome}>Select or search a contact to start chatting ✨</div>
//         )}
//       </div>

//       {/* Slide‑in profile panel */}
//       <AnimatePresence>
//         {showProfile && (
//           <ProfilePanel
//             user={user}                     // pass user for display/edit
//             onClose={() => setShowProfile(false)}
//           />
//         )}
//       </AnimatePresence>
//     </div>
//   );
// }

// const styles = {
//   wrap:   { height: "100vh", display: "flex", flexDirection: "column", background: "#F3E5F5" },
//   body:   { flex: 1, display: "flex" },
//   welcome:{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
//             color: "#7E57C2", fontSize: 18, opacity: 0.8 }
// };
// client/src/components/Main.js



import React, { useState, useContext, useEffect } from "react";
import io from "socket.io-client";
import { AnimatePresence } from "framer-motion";

import { AuthContext } from "../contexts/AuthContext";
import { ThemeContext } from "../contexts/ThemeContext";

import SearchBar   from "./SearchBar";
import ChatList    from "./Chat/ChatList";
import ChatWindow  from "./Chat/ChatWindow";
import Navbar      from "./Navbar";
import ProfilePanel from "./Accounts/ProfilePanel";

const socket = io("https://bpbackend.onrender.com");   // backend port

/* ---------- tiny helper ---------- */
const useIsMobile = () => {
  const [m, setM] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setM(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return m;
};

export default function Main() {
  const { user, logout } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);

  const [current, setCurrent]   = useState(null);     // selected peer
  const [showProfile, setShowProfile] = useState(false);
  const isMobile = useIsMobile();

  /* join personal room once */
  useEffect(() => { socket.emit("join", user.userId); }, [user]);

  /* desktop notifications */
  useEffect(() => {
    if (Notification.permission === "default") Notification.requestPermission();
    const notif = (m) => {
      if (document.hidden && Notification.permission === "granted" && m.sender !== user.userId) {
        new Notification("New message", { body: m.text || "Image 📷" });
      }
    };
    socket.on("receiveMessage", notif);
    return () => socket.off("receiveMessage", notif);
  }, [socket, user]);

  /* -------- UI -------- */
  return (
    <div style={S.wrap}>

      {/* Hide Navbar only on mobile *inside* a chat */}
      {(!isMobile || !current) && (
        <Navbar logout={logout} onProfile={() => setShowProfile(true)} />
      )}

      {/* Hide SearchBar on mobile while chatting */}
      {(!isMobile || !current) && (
        <SearchBar onFound={setCurrent} />
      )}

      <div style={S.body}>
        <ChatList
          current={current}
          onPick={setCurrent}
          socket={socket}
        />

        {current ? (
          <ChatWindow
            peer={current}
            socket={socket}
            onBack={() => setCurrent(null)}   // ← back-arrow handler
          />
        ) : (
          <div style={S.welcome}>
            Select or search a contact to start chatting ✨
          </div>
        )}
      </div>

      {/* profile slide-in */}
      <AnimatePresence>
        {showProfile && (
          <ProfilePanel
            onClose={() => setShowProfile(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* --------------- theme-aware, responsive styles --------------- */
const S = {
  wrap: {
    height: "98vh",
    display: "flex",
    flexDirection: "column",
    background: "var(--primarySoft)",
    fontFamily: "var(--font-ui)",
    color: "var(--textMain)",
  },
  body: {
    flex: 1,
    display: "flex",
    minHeight: 0,            // allow children to scroll
  },
  welcome: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "var(--textLight)",
    fontSize: "clamp(1.1rem, 3vw, 1.4rem)",
    padding: 20,
    textAlign: "center",
  },
};

