
// // ✅ client/src/components/Chat/ChatList.js
// import React, { useEffect, useState, useContext } from "react";
// import { fetchChatList } from "../../api";
// import { AuthContext } from "../../contexts/AuthContext";
// import { motion } from "framer-motion";

// export default function ChatList({ current, onPick, socket }) {
//   const { user } = useContext(AuthContext);
//   const [peers, setPeers] = useState([]);

//   const load = async () => {
//     try {
//       const res = await fetchChatList(user._id);
//       setPeers(res.data.users);
//     } catch (e) {
//       console.error("Chat list fetch failed:", e);
//     }
//   };

//   useEffect(() => { load(); }, [user]);

//   useEffect(() => {
//     socket.on("refreshConversations", load);
//     return () => socket.off("refreshConversations", load);
//   }, [socket]);

//   return (
//     <div style={styles.side}>
//       {peers.length === 0 && (
//         <div style={{ opacity: 0.7 }}>
//           No chats yet – use the search bar ↑
//         </div>
//       )}

//       {peers.map(p => (
//         <motion.div
//           key={p._id}
//           style={{
//             ...styles.item,
//             background: current?._id === p._id ? "#DDD6F3" : "transparent"
//           }}
//           whileTap={{ scale: 0.97 }}
//           onClick={() => onPick(p)}
//         >
//           <div style={styles.mobile}>{p.mobile || p.username}</div>
//           {p.lastText && <div style={styles.snip}>{p.lastText}</div>}
//         </motion.div>
//       ))}
//     </div>
//   );
// }

// const styles = {
//   side: { width: 260, overflowY: "auto", background: "#EDE7F6", borderRight: "1px solid #D1C4E9", padding: 8 },
//   item: { padding: 12, borderRadius: 8, cursor: "pointer", marginBottom: 4 },
//   mobile: { fontWeight: 600, color: "#512DA8" },
//   snip: { fontSize: 12, color: "#5E5E5E", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }
// };
// src/components/Chat/ChatList.jsx







// import React, { useEffect, useState, useContext } from "react";
// import { fetchChatList } from "../../api";
// import { AuthContext } from "../../contexts/AuthContext";
// import { motion } from "framer-motion";

// /* 10 % of the accent into the panel surface */
// const LIST_BG  = "color-mix(in srgb, var(--primary) 10%, var(--primarySoft))";
// /* Selected-row highlight (25 % accent) */
// const SELECT_BG = "color-mix(in srgb, var(--primary) 25%, transparent)";

// /* ---------- small helper ---------- */
// const useIsMobile = () => {
//   const [mobile, setMobile] = useState(window.innerWidth <= 768);
//   useEffect(() => {
//     const h = () => setMobile(window.innerWidth <= 768);
//     window.addEventListener("resize", h);
//     return () => window.removeEventListener("resize", h);
//   }, []);
//   return mobile;
// };

// export default function ChatList({ current, onPick, socket }) {
//   const { user } = useContext(AuthContext);
//   const [peers, setPeers] = useState([]);
//   const isMobile = useIsMobile();

//   const load = async () => {
//     try {
//       const res = await fetchChatList(user._id);
//       setPeers(res.data.users);
//     } catch (e) {
//       console.error("Chat list fetch failed:", e);
//     }
//   };

//   /* initial + socket refresh */
//   useEffect(() => { load(); }, [user]);
//   useEffect(() => {
//     socket.on("refreshConversations", load);
//     return () => socket.off("refreshConversations", load);
//   }, [socket]);

//   /* hide list when a chat is selected on mobile */
//   const hidden = isMobile && current;

//   return (
//     <div
//       style={{
//         ...S.side,
//         width  : isMobile ? "100%" : "18rem",
//         display: hidden   ? "none" : "block",
//       }}
//     >
//       {peers.length === 0 && (
//         <div style={S.empty}>No chats yet – use the search bar ↑</div>
//       )}

//       {peers.map((p) => {
//         const selected = current?._id === p._id;
//         return (
//           <motion.div
//             key={p._id}
//             style={{
//               ...S.item,
//               background: selected ? SELECT_BG : "transparent",
//             }}
//             whileHover={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}  // shadow
//             whileTap={{ scale: 0.97 }}
//             onClick={() => onPick(p)}
//           >
//             <div
//               style={{
//                 ...S.mobile,
//                 color: selected ? "orange" : "var(--textMain)",
//               }}
//             >
//               {p.mobile || p.username}
//             </div>
//             {p.lastText && <div style={S.snip}>{p.lastText}</div>}
//           </motion.div>
//         );
//       })}
//     </div>
//   );
// }

// /* ---------- theme-aware styles ---------- */
// const S = {
//   side: {
//     overflowY: "auto",
//     background: LIST_BG,
//     borderRight: "1px solid var(--border)",
//     padding: 12,
//     fontFamily: "var(--font-ui)",
//     boxSizing: "border-box",
//     height: "100%",
//   },
//   empty: {
//     opacity: 0.7,
//     fontSize: "clamp(0.95rem, 2.4vw, 1.05rem)",
//     textAlign: "center",
//     padding: "40px 8px",
//     color: "var(--textLight)",
//   },
//   item: {
//     padding: 14,
//     borderRadius: 10,
//     cursor: "pointer",
//     marginBottom: 6,
//     transition: "background 0.15s, box-shadow 0.15s",
//   },
//   mobile: {
//     fontWeight: 700,
//     fontSize: "clamp(1.05rem, 2.5vw, 1.25rem)",
//   },
//   snip: {
//     fontSize: "clamp(0.9rem, 2.3vw, 1rem)",
//     color: "var(--textLight)",
//     whiteSpace: "nowrap",
//     overflow: "hidden",
//     textOverflow: "ellipsis",
//     marginTop: 2,
//   },
// };


import React, { useEffect, useState, useContext } from "react";
import { fetchChatList } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import { motion } from "framer-motion";

/* 10 % of the accent into the panel surface */
const LIST_BG  = "color-mix(in srgb, var(--primary) 10%, var(--primarySoft))";
/* Selected-row highlight (25 % accent) */
const SELECT_BG = "color-mix(in srgb, var(--primary) 25%, transparent)";

/* ---------- small helper ---------- */
const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
};

export default function ChatList({ current, onPick, socket }) {
  const { user } = useContext(AuthContext);
  const [peers, setPeers] = useState([]);
  const isMobile = useIsMobile();

  const load = async () => {
    try {
      const res = await fetchChatList(user._id);
      // Initialize unreadCount if not provided
      const users = res.data.users.map(u => ({ ...u, unreadCount: u.unreadCount || 0 }));
      setPeers(users);
    } catch (e) {
      console.error("Chat list fetch failed:", e);
    }
  };

  /* initial + socket refresh */
  useEffect(() => { load(); }, [user]);
  useEffect(() => {
    socket.on("refreshConversations", load);
    return () => socket.off("refreshConversations", load);
  }, [socket]);

  // Listen for new messages and update unread count
  useEffect(() => {
    const onNewMessage = (message) => {
      if (message.sender !== user._id && message.receiver === user._id && (!current || current._id !== message.sender)) {
        setPeers(prevPeers =>
          prevPeers.map(p =>
            p._id === message.sender
              ? { ...p, unreadCount: (p.unreadCount || 0) + 1 }
              : p
          )
        );
      }
    };
    socket.on("receiveMessage", onNewMessage);
    return () => socket.off("receiveMessage", onNewMessage);
  }, [socket, user._id, current]);

  /* hide list when a chat is selected on mobile */
  const hidden = isMobile && current;

  return (
    <div
      style={{
        ...S.side,
        width  : isMobile ? "100%" : "18rem",
        display: hidden   ? "none" : "block",
      }}
    >
      {peers.length === 0 && (
        <div style={S.empty}>No chats yet – use the search bar ↑</div>
      )}
      {peers.map((p) => {
        const selected = current?._id === p._id;
        return (
          <motion.div
            key={p._id}
            style={{
              ...S.item,
              background: selected ? SELECT_BG : "transparent",
              position: "relative", // <-- Added for badge positioning
            }}
            whileHover={{ boxShadow: "0 2px 8px rgba(0,0,0,0.15)" }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onPick(p)}
          >
            <div
              style={{
                ...S.mobile,
                color: selected ? "orange" : "var(--textMain)",
              }}
            >
              {p.mobile || p.username}
            </div>
            {p.lastText && <div style={S.snip}>{p.lastText}</div>}
            {/* Unread message badge */}
            {p.unreadCount > 0 && (
              <div style={{
                position: "absolute",
                right: 10,
                top: 10,
                background: "green",
                color: "white",
                borderRadius: "50%",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 12,
              }}>
                {p.unreadCount}
              </div>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

/* ---------- theme-aware styles ---------- */
const S = {
  side: {
    overflowY: "auto",
    background: LIST_BG,
    borderRight: "1px solid var(--border)",
    padding: 12,
    fontFamily: "var(--font-ui)",
    boxSizing: "border-box",
    height: "100%",
  },
  empty: {
    opacity: 0.7,
    fontSize: "clamp(0.95rem, 2.4vw, 1.05rem)",
    textAlign: "center",
    padding: "40px 8px",
    color: "var(--textLight)",
  },
  item: {
    padding: 14,
    borderRadius: 10,
    cursor: "pointer",
    marginBottom: 6,
    transition: "background 0.15s, box-shadow 0.15s",
  },
  mobile: {
    fontWeight: 700,
    fontSize: "clamp(1.05rem, 2.5vw, 1.25rem)",
  },
  snip: {
    fontSize: "clamp(0.9rem, 2.3vw, 1rem)",
    color: "var(--textLight)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
    marginTop: 2,
  },
};
