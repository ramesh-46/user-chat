// import React, { useState, useEffect, useRef, useContext } from "react";
// import { fetchMessages, sendMessage, toggleStar } from "../../api";
// import { AuthContext } from "../../contexts/AuthContext";
// import MessageInput from "./MessageInput";
// import CallUI from "../Call/CallButton"; // ✅ Added for calling
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";
// dayjs.extend(relativeTime);

// export default function ChatWindow({ peer, socket }) {
//   const { user } = useContext(AuthContext);
//   const [msgs, setMsgs] = useState([]);
//   const [typing, setTyping] = useState(false);
//   const [online, setOnline] = useState(peer.online);
//   const [last, setLast] = useState(peer.lastSeen);
//   const bottom = useRef();

//   useEffect(() => {
//     if (!user?._id || !peer?._id) return;
//     (async () => {
//       const res = await fetchMessages(user._id, peer._id);
//       setMsgs(res.data.messages);
//     })();
//   }, [peer, user]);

//   useEffect(() => {
//     const recv = m => {
//       if (m.sender === peer._id && m.receiver === user._id)
//         setMsgs(p => [...p, m]);
//     };
//     const typingHandler = id => {
//       if (id === peer._id) {
//         setTyping(true);
//         setTimeout(() => setTyping(false), 1500);
//       }
//     };
//     const onlineH = id => id === peer._id && setOnline(true);
//     const offlineH = id => {
//       if (id === peer._id) {
//         setOnline(false);
//         setLast(new Date());
//       }
//     };

//     socket.on("receiveMessage", recv);
//     socket.on("peerTyping", typingHandler);
//     socket.on("userOnline", onlineH);
//     socket.off("userOffline", offlineH);
//     return () => {
//       socket.off("receiveMessage", recv);
//       socket.off("peerTyping", typingHandler);
//       socket.off("userOnline", onlineH);
//       socket.off("userOffline", offlineH);
//     };
//   }, [socket, peer, user]);

//   useEffect(() => {
//     bottom.current?.scrollIntoView({ behavior: "smooth" });
//   }, [msgs]);

//   const send = async (text, file) => {
//     const fd = new FormData();
//     fd.append("sender", user._id);
//     fd.append("receiver", peer._id);
//     if (text) fd.append("text", text);
//     if (file) fd.append("file", file);
//     const res = await sendMessage(fd);
//     socket.emit("sendMessage", res.data.message);
//     setMsgs(p => [...p, res.data.message]);
//   };

//   const fileURL = p => `http://localhost:4000${p}`;

//   return (
//     <div style={styles.win}>
//       {/* Chat Header */}
//       <div style={styles.head}>
//         <div>{peer.mobile || peer.username}</div>
//         <small style={{ fontSize: 12 }}>
//           {online ? (
//             <span style={{ color: "#0f0" }}>● Online</span>
//           ) : (
//             `Last seen ${dayjs(last).fromNow()}`
//           )}
//         </small>
//       </div>

//       {/* ✅ Call Button UI */}
//       <div style={{ padding: "4px 16px" }}>
//         <CallUI peer={peer} />
//       </div>

//       {/* Typing Indicator */}
//       {typing && (
//         <div style={styles.typing}>
//           <i className="fas fa-pen-nib" style={styles.icon}></i> … typing
//         </div>
//       )}

//       {/* Scrollable Message Area */}
//       <div style={styles.flow}>
//         {msgs.map(m => (
//           <motion.div
//             key={m._id}
//             style={{
//               ...styles.bubble,
//               alignSelf: m.sender === user._id ? "flex-end" : "flex-start",
//               background: m.sender === user._id ? "#6A11CB" : "#fff",
//               color: m.sender === user._id ? "#fff" : "#000"
//             }}
//             initial={{ opacity: 0, y: 20 }}
//             animate={{ opacity: 1, y: 0 }}
//           >
//             {m.text && <span style={styles.messageText}>{m.text}</span>}
//             {m.file && m.fileType === "image" && (
//               <img
//                 src={fileURL(m.file)}
//                 alt="sent-img"
//                 style={styles.thumbnail}
//                 onClick={() => window.open(fileURL(m.file), "_blank")}
//               />
//             )}
//             {m.file && m.fileType === "video" && (
//               <video
//                 style={styles.thumbnail}
//                 controls
//                 onClick={() => window.open(fileURL(m.file), "_blank")}
//               >
//                 <source src={fileURL(m.file)} type="video/mp4" />
//               </video>
//             )}
//             {m.file && m.fileType === "audio" && (
//               <audio controls style={styles.audioPlayer}>
//                 <source src={fileURL(m.file)} type="audio/webm" />
//               </audio>
//             )}
//             <span
//               style={{ marginLeft: 8, cursor: "pointer" }}
//               onClick={() => toggleStar(m._id, !m.starred)}
//             >
//               {m.starred ? "⭐" : "☆"}
//             </span>
//           </motion.div>
//         ))}
//         <div ref={bottom} />
//       </div>

//       {/* Message Input */}
//       <MessageInput
//         onSend={send}
//         onTyping={() =>
//           socket.emit("typing", { from: user._id, to: peer._id })
//         }
//         showEmojiPicker
//       />
//     </div>
//   );
// }

// const styles = {
//   win: {
//     flex: 1,
//     display: "flex",
//     flexDirection: "column",
//     background: "#EDE7F6",
//     height: "100vh",
//     overflow: "hidden",
//     boxSizing: "border-box",
//   },
//   head: {
//     padding: 12,
//     background: "#512DA8",
//     color: "#fff",
//     fontWeight: "bold",
//     display: "flex",
//     justifyContent: "space-between",
//     borderBottom: "1px solid #ccc",
//   },
//   typing: {
//     padding: "2px 16px",
//     fontSize: 12,
//     color: "#7E57C2",
//     marginBottom: 8,
//   },
//   icon: {
//     marginRight: 4,
//     fontSize: 14,
//   },
//   flow: {
//     flex: 1,
//     padding: 16,
//     overflowY: "auto",
//     display: "flex",
//     flexDirection: "column",
//     gap: 8,
//     maxHeight: "calc(100vh - 200px)",
//     scrollbarWidth: "thin",
//     boxSizing: "border-box",
//   },
//   bubble: {
//     maxWidth: "60%",
//     padding: 12,
//     borderRadius: 12,
//     wordBreak: "break-word",
//     boxShadow: "0 2px 5px rgba(0,0,0,0.1)",
//   },
//   messageText: {
//     fontSize: 14,
//   },
//   thumbnail: {
//     maxWidth: 200,
//     maxHeight: 200,
//     borderRadius: 8,
//     marginTop: 4,
//     cursor: "zoom-in",
//   },
//   audioPlayer: {
//     width: 200,
//     marginTop: 4,
//   },
// };













// import React, { useState, useEffect, useRef, useContext } from "react";
// import { fetchMessages, sendMessage, toggleStar } from "../../api";
// import { AuthContext } from "../../contexts/AuthContext";
// import MessageInput from "./MessageInput";
// import CallUI from "../Call/CallButton";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";

// dayjs.extend(relativeTime);

// const useIsMobile = () => {
//   const [m, setM] = useState(window.innerWidth <= 768);
//   useEffect(() => {
//     const h = () => setM(window.innerWidth <= 768);
//     window.addEventListener("resize", h);
//     return () => window.removeEventListener("resize", h);
//   }, []);
//   return m;
// };

// export default function ChatWindow({ peer, socket, onBack = () => {} }) {
//   const { user } = useContext(AuthContext);
//   const [msgs, setMsgs] = useState([]);
//   const [typing, setTyping] = useState(false);
//   const [online, setOnline] = useState(peer.online);
//   const [last, setLast] = useState(peer.lastSeen);
//   const bottom = useRef();
//   const isMobile = useIsMobile();

//   useEffect(() => {
//     if (!user?._id || !peer?._id) return;
//     (async () => {
//       const res = await fetchMessages(user._id, peer._id);
//       setMsgs(res.data.messages);
//     })();
//   }, [peer, user]);

//   useEffect(() => {
//     const recv = (m) => m.sender === peer._id && m.receiver === user._id && setMsgs((p) => [...p, m]);
//     const typingH = (id) => id === peer._id && (setTyping(true), setTimeout(() => setTyping(false), 1500));
//     const onlineH = (id) => id === peer._id && setOnline(true);
//     const offlineH = (id) => id === peer._id && (setOnline(false), setLast(new Date()));

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
//   }, [socket, peer, user]);

//   useEffect(() => bottom.current?.scrollIntoView({ behavior: "smooth" }), [msgs]);

//   const send = async (text, file, fileType, content) => {
//     const fd = new FormData();
//     fd.append("sender", user._id);
//     fd.append("receiver", peer._id);
//     if (text) fd.append("text", text);
//     if (file) fd.append("file", file);
//     if (fileType) fd.append("fileType", fileType);
//     if (content) fd.append("content", content);

//     try {
//       const res = await sendMessage(fd);
//       socket.emit("sendMessage", res.data.message);
//       setMsgs((p) => [...p, res.data.message]);
//     } catch (error) {
//       console.error("Error sending message:", error);
//     }
//   };

//   const fileURL = (p) => `http://localhost:4000${p}`;

//   const ACCENT20 = "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))";
//   const mineStyle = { background: "#FFFFFF", color: "var(--primarySoft)" };
//   const otherStyle = { background: "white", color: "black" };

//   const headLeftStyle = { ...S.headLeft, fontSize: isMobile ? "0.8rem" : S.headLeft.fontSize };
//   const headRightStyle = { ...S.headRight, fontSize: isMobile ? "0.7rem" : S.headRight.fontSize };

//   return (
//     <div style={{ ...S.win, width: isMobile ? "100%" : "auto" }}>
//       <div style={{ ...S.head, background: ACCENT20, color: "var(--textMain)" }}>
//         {isMobile && (
//           <button style={S.back} onClick={onBack}>←</button>
//         )}
//         <div style={headLeftStyle}>{peer.mobile || peer.username}</div>
//         <CallUI peer={peer} />
//         <small style={headRightStyle}>
//           {online
//             ? <span style={{ color: "#0f0" }}>● Online</span>
//             : `Last seen ${dayjs(last).fromNow()}`}
//         </small>
//       </div>
//       {typing && (
//         <div style={S.typing}>
//           <i className="fas fa-pen-nib" style={S.icon}/> … typing
//         </div>
//       )}
//       <div style={S.flow}>
//         {msgs.map((m) => {
//           const mine = m.sender === user._id;
//           return (
//             <motion.div
//               key={m._id}
//               style={{
//                 ...S.bubble,
//                 ...(mine ? mineStyle : otherStyle),
//                 alignSelf: mine ? "flex-end" : "flex-start",
//               }}
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//             >
//               {m.text && <span style={isMobile ? {...S.messageText, fontSize: "0.8rem", fontWeight: 500} : S.messageText}>{m.text}</span>}
//               {m.file && m.fileType === "image" && (
//                 <img
//                   src={fileURL(m.file)}
//                   alt="sent"
//                   style={isMobile ? {...S.thumbnail, maxWidth: 120, maxHeight: 120} : S.thumbnail}
//                   onClick={() => window.open(fileURL(m.file))}
//                 />
//               )}
//               {m.file && m.fileType === "video" && (
//                 <video
//                   style={isMobile ? {...S.thumbnail, maxWidth: 120, maxHeight: 120} : S.thumbnail}
//                   controls
//                   onClick={() => window.open(fileURL(m.file))}
//                 >
//                   <source src={fileURL(m.file)} type="video/mp4" />
//                 </video>
//               )}
//               {m.file && m.fileType === "audio" && (
//                 <audio controls style={isMobile ? {...S.audioPlayer, width: 150} : S.audioPlayer}>
//                   <source src={fileURL(m.file)} type="audio/webm" />
//                 </audio>
//               )}
//               {m.file && m.fileType === "document" && (
//                 <a href={fileURL(m.file)} download style={S.documentLink}>
//                   Download Document
//                 </a>
//               )}
//               {m.fileType === "location" && m.content && (
//                 <div style={isMobile ? {...S.mapContainer, width: "120px", height: "120px"} : S.mapContainer}>
//                   <iframe
//                     width="160"
//                     height="150"
//                     frameBorder="0"
//                     scrolling="no"
//                     marginHeight="0"
//                     marginWidth="0"
//                     src={`https://maps.google.com/maps?q=${m.content.lat},${m.content.lng}&z=15&output=embed`}
//                   ></iframe>
//                 </div>
//               )}
//               {m.fileType === "contact" && m.content && (
//                 <div style={S.contactBox}>
//                   <p style={{...S.contactName, fontWeight: isMobile ? 500 : "bold"}}>{m.content.name}</p>
//                   <p style={S.contactPhone}>{m.content.phone}</p>
//                 </div>
//               )}
//               {m.fileType === "poll" && m.content && (
//                 <div style={S.pollBox}>
//                   <p style={{...S.pollQuestion, fontWeight: isMobile ? 500 : "bold"}}>{m.content.question}</p>
//                   <div style={S.pollOptions}>
//                     {m.content.options.map((option, index) => (
//                       <button key={index} style={S.pollOption}>
//                         {option}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               )}
//               <span
//                 style={S.star}
//                 onClick={() => toggleStar(m._id, !m.starred)}
//               >
//                 {m.starred ? "⭐" : "☆"}
//               </span>
//             </motion.div>
//           );
//         })}
//         <div ref={bottom} />
//       </div>
//       <MessageInput onSend={send} onTyping={() => socket.emit("typing", { from: user._id, to: peer._id })} />
//     </div>
//   );
// }

// const S = {
//   win: {
//     flex: 1,
//     display: "flex",
//     flexDirection: "column",
//     background: "var(--surfaceAlt)",
//     height: "100%",
//     overflow: "hidden",
//     fontFamily: "var(--font-ui)",
//   },
//   head: {
//     padding: "16px 20px",
//     fontWeight: 700,
//     display: "flex",
//     alignItems: "center",
//     gap: 12,
//   },
//   back: {
//     border: "none",
//     background: "transparent",
//     fontSize: "1.6rem",
//     cursor: "pointer",
//     lineHeight: 1,
//     color: "var(--textMain)",
//   },
//   headLeft: {
//     fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
//     flex: 1,
//   },
//   headRight: {
//     fontSize: "clamp(0.85rem, 2.2vw, 1rem)",
//   },
//   typing: {
//     padding: "2px 20px",
//     fontSize: "clamp(0.9rem, 2.3vw, 1rem)",
//     color: "var(--primary)",
//     marginBottom: 8,
//   },
//   icon: { marginRight: 4, fontSize: 14 },
//   flow: {
//     flex: 1,
//     padding: 20,
//     overflowY: "auto",
//     display: "flex",
//     flexDirection: "column",
//     gap: 10,
//     scrollbarWidth: "none",
//     msOverflowStyle: "none",
//     scrollbarColor: "transparent transparent",
//   },
//   bubble: {
//     maxWidth: "70%",
//     padding: "14px 16px",
//     borderRadius: 14,
//     wordBreak: "break-word",
//     boxShadow: "0 3px 6px rgba(0,0,0,.12)",
//     position: "relative",
//   },
//   messageText: {
//     fontSize: "clamp(1.05rem, 2.4vw, 1.15rem)",
//     lineHeight: 1.45,
//   },
//   star: {
//     position: "absolute",
//     bottom: 8,
//     right: 10,
//     cursor: "pointer",
//     userSelect: "none",
//   },
//   thumbnail: {
//     maxWidth: 220,
//     maxHeight: 220,
//     borderRadius: 10,
//     marginTop: 8,
//     cursor: "zoom-in",
//   },
//   audioPlayer: { width: 220, marginTop: 8 },
//   documentLink: {
//     display: "block",
//     marginTop: 8,
//     color: "var(--primary)",
//     textDecoration: "underline",
//     cursor: "pointer",
//   },
//   mapContainer: {
//     width: "200px",
//     height: "200px",
//     margin: "10px 0",
//   },
//   contactBox: {
//     border: "1px solid #ccc",
//     borderRadius: "8px",
//     padding: "10px",
//     backgroundColor: "#f9f9f9",
//     margin: "10px 0",
//   },
//   contactName: {
//     fontWeight: "bold",
//     margin: "5px 0",
//   },
//   contactPhone: {
//     margin: "5px 0",
//     color: "#555",
//   },
//   pollBox: {
//     border: "1px solid #ccc",
//     borderRadius: "8px",
//     padding: "10px",
//     backgroundColor: "#f9f9f9",
//     margin: "10px 0",
//   },
//   pollQuestion: {
//     fontWeight: "bold",
//     margin: "5px 0",
//   },
//   pollOptions: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "5px",
//   },
//   pollOption: {
//     padding: "8px",
//     backgroundColor: "#e0e0e0",
//     border: "none",
//     borderRadius: "4px",
//     cursor: "pointer",
//     textAlign: "center",
//   },
// };












// import React, { useState, useEffect, useRef, useContext } from "react";
// import { fetchMessages, sendMessage, toggleStar, blockUser, unblockUser } from "../../api";
// import { AuthContext } from "../../contexts/AuthContext";
// import MessageInput from "./MessageInput";
// import CallUI from "../Call/CallButton";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";

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

// export default function ChatWindow({ peer, socket, onBack = () => {} }) {
//   const { user } = useContext(AuthContext);
//   const [msgs, setMsgs] = useState([]);
//   const [typing, setTyping] = useState(false);
//   const [online, setOnline] = useState(peer?.online || false);
//   const [last, setLast] = useState(peer?.lastSeen || new Date());
//   const [isUserBlocked, setIsUserBlocked] = useState(false);
//   const [showBlockDialog, setShowBlockDialog] = useState(false);
//   const bottom = useRef();
//   const isMobile = useIsMobile();

//   const userId = user?._id?.toString();
//   const peerId = peer?._id?.toString();

//   useEffect(() => {
//     if (!userId || !peerId) return;

//     console.log(`[Socket] User ${userId} joining room`);
//     socket.emit("join", userId);

//     const fetchInitialMessages = async () => {
//       try {
//         const res = await fetchMessages(userId, peerId);
//         setMsgs(res.data.messages);
//       } catch (err) {
//         console.error("Failed to load messages:", err);
//       }
//     };

//     fetchInitialMessages();
//   }, [peerId, userId, socket]);

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

//   useEffect(() => {
//     const recv = (m) => {
//       if (isUserBlocked) {
//         console.log("Blocked user - message ignored");
//         return;
//       }

//       const sender = m.sender.toString();
//       const receiver = m.receiver.toString();

//       if ((sender === peerId && receiver === userId) || (sender === userId && receiver === peerId)) {
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
//   }, [socket, userId, peerId, isUserBlocked]);

//   useEffect(() => {
//     bottom.current?.scrollIntoView({ behavior: "smooth" });
//   }, [msgs]);

//   const send = async (text, file, fileType, content) => {
//     if (isUserBlocked) {
//       console.log("Cannot send message: You are blocked.");
//       return;
//     }

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
//         if (!prev.some((msg) => msg._id === message._id)) {
//           return [...prev, message];
//         }
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

//   const fileURL = (p) => `http://localhost:4000${p}`;

//   const handleLongPress = (id) => {
//     setMsgs((prev) =>
//       prev.map((msg) => (msg._id === id ? { ...msg, marked: !msg.marked } : msg))
//     );
//   };

//   const handleDoubleClick = (id) => {
//     setMsgs((prev) =>
//       prev.map((msg) => (msg._id === id ? { ...msg, marked: !msg.marked } : msg))
//     );
//   };

//   useEffect(() => {
//     const reconnectHandler = () => {
//       console.log("[Socket] Reconnected. Rejoining room...");
//       socket.emit("join", userId);
//     };

//     socket.on("reconnect", reconnectHandler);

//     return () => {
//       socket.off("reconnect", reconnectHandler);
//     };
//   }, [socket, userId]);

//   const ACCENT20 = "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))";
//   const mineStyle = { background: "#FFFFFF", color: "var(--primarySoft)" };
//   const otherStyle = { background: "white", color: "black" };
//   const headLeftStyle = { ...S.headLeft, fontSize: isMobile ? "0.8rem" : S.headLeft.fontSize };
//   const headRightStyle = { ...S.headRight, fontSize: isMobile ? "0.7rem" : S.headRight.fontSize };

//   return (
//     <div style={{ ...S.win, width: isMobile ? "100%" : "auto" }}>
//       <div style={{ ...S.head, background: ACCENT20, color: "var(--textMain)" }}>
//         {isMobile && <button style={S.back} onClick={onBack}>←</button>}
//         <div style={headLeftStyle}>{peer.mobile || peer.username}</div>
//         <CallUI peer={peer} />
//         <button
//           style={{
//             backgroundColor: "green",
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
//             if (isUserBlocked) {
//               handleUnblockUser();
//             } else {
//               setShowBlockDialog(true);
//             }
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
//           position: "fixed",
//           top: "50%",
//           left: "50%",
//           transform: "translate(-50%, -50%)",
//           backgroundColor: "black",
//           color: "white",
//           fontFamily: "var(--font-ui)",
//           padding: "20px",
//           borderRadius: "10px",
//           boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
//           zIndex: 1000,
//           textAlign: "center",
//         }}>
//           <p style={{
//             fontWeight: "bold",
//             fontSize: isMobile ? "0.9rem" : "1rem",
//             margin: "10px 0"
//           }}>
//             Are you sure you want to block this user?
//           </p>
//           <button
//             style={{
//               backgroundColor: "red",
//               color: "white",
//               border: "none",
//               padding: "8px 16px",
//               margin: "5px",
//               borderRadius: "4px",
//               cursor: "pointer",
//               fontWeight: "bold"
//             }}
//             onClick={handleBlockUser}
//           >
//             Yes, Block
//           </button>
//           <button
//             style={{
//               backgroundColor: "green",
//               color: "white",
//               border: "none",
//               padding: "8px 16px",
//               margin: "5px",
//               borderRadius: "4px",
//               cursor: "pointer",
//               fontWeight: "bold"
//             }}
//             onClick={() => setShowBlockDialog(false)}
//           >
//             Cancel
//           </button>
//         </div>
//       )}
//       {typing && (
//         <div style={S.typing}>
//           <i className="fas fa-pen-nib" style={S.icon} /> … typing
//         </div>
//       )}
//       <div style={S.flow}>
//         {msgs.map((m) => {
//           const mine = m.sender.toString() === userId;
//           return (
//             <motion.div
//               key={m._id}
//               style={{
//                 ...S.bubble,
//                 ...(mine ? mineStyle : otherStyle),
//                 alignSelf: mine ? "flex-end" : "flex-start",
//                 backgroundColor: m.marked ? "lightgreen" : (mine ? mineStyle.background : otherStyle.background),
//               }}
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               onTouchStart={isMobile ? () => handleLongPress(m._id) : undefined}
//               onDoubleClick={!isMobile ? () => handleDoubleClick(m._id) : undefined}
//             >
//               {m.text && (
//                 <span style={{ ...S.messageText, fontWeight: 'bold', color: 'black' }}>
//                   {m.text}
//                 </span>
//               )}
//               {/* Additional message content handling (images, videos, etc.) */}
//             </motion.div>
//           );
//         })}
//         <div ref={bottom} />
//       </div>
//       <MessageInput
//         onSend={send}
//         onTyping={() => {
//           socket.emit("typing", { from: userId, to: peerId });
//         }}
//         disabled={isUserBlocked}
//         placeholder={isUserBlocked ? "This user is blocked. You cannot send messages." : "Type a message"}
//       />
//     </div>
//   );
// }

// const S = {
//   win: {
//     flex: 1,
//     display: "flex",
//     flexDirection: "column",
//     background: "var(--surfaceAlt)",
//     height: "100%",
//     overflow: "hidden",
//     fontFamily: "var(--font-ui)",
//   },
//   head: {
//     padding: "16px 20px",
//     fontWeight: 700,
//     display: "flex",
//     alignItems: "center",
//     gap: 12,
//   },
//   back: {
//     border: "none",
//     background: "transparent",
//     fontSize: "1.6rem",
//     cursor: "pointer",
//     lineHeight: 1,
//     color: "var(--textMain)",
//   },
//   headLeft: {
//     fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
//     flex: 1,
//   },
//   headRight: {
//     fontSize: "clamp(0.85rem, 2.2vw, 1rem)",
//   },
//   typing: {
//     padding: "2px 20px",
//     fontSize: "clamp(0.9rem, 2.3vw, 1rem)",
//     color: "var(--primary)",
//     marginBottom: 8,
//   },
//   icon: { marginRight: 4, fontSize: 14 },
//   flow: {
//     flex: 1,
//     padding: 10,
//     overflowY: "auto",
//     display: "flex",
//     flexDirection: "column",
//     gap: 5,
//     scrollbarWidth: "none",
//     msOverflowStyle: "none",
//     scrollbarColor: "transparent transparent",
//   },
//   bubble: {
//     maxWidth: "70%",
//     padding: "8px 10px",
//     borderRadius: 14,
//     wordBreak: "break-word",
//     boxShadow: "0 3px 6px rgba(0,0,0,.12)",
//     position: "relative",
//   },
//   messageText: {
//     fontSize: "clamp(1.05rem, 2.4vw, 1.15rem)",
//     lineHeight: 1.45,
//   },
//   thumbnail: {
//     maxWidth: 220,
//     maxHeight: 220,
//     borderRadius: 10,
//     marginTop: 8,
//     cursor: "zoom-in",
//   },
//   audioPlayer: { width: 220, marginTop: 8 },
//   mapContainer: {
//     width: "200px",
//     height: "200px",
//     margin: "10px 0",
//   },
//   contactBox: {
//     border: "1px solid #ccc",
//     borderRadius: "8px",
//     padding: "10px",
//     backgroundColor: "#f9f9f9",
//     margin: "10px 0",
//   },
//   contactName: {
//     fontWeight: "bold",
//     margin: "5px 0",
//   },
//   contactPhone: {
//     margin: "5px 0",
//     color: "#555",
//   },
//   pollBox: {
//     border: "1px solid #ccc",
//     borderRadius: "8px",
//     padding: "10px",
//     backgroundColor: "#f9f9f9",
//     margin: "10px 0",
//   },
//   pollQuestion: {
//     fontWeight: "bold",
//     margin: "5px 0",
//   },
//   pollOptions: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "5px",
//   },
//   pollOption: {
//     padding: "8px",
//     backgroundColor: "#e0e0e0",
//     border: "none",
//     borderRadius: "4px",
//     cursor: "pointer",
//     textAlign: "center",
//   },
// };









// import React, { useState, useEffect, useRef, useContext } from "react";
// import { fetchMessages, sendMessage, toggleStar, blockUser, unblockUser } from "../../api";
// import { AuthContext } from "../../contexts/AuthContext";
// import MessageInput from "./MessageInput";
// import CallUI from "../Call/CallButton";
// import { motion } from "framer-motion";
// import dayjs from "dayjs";
// import relativeTime from "dayjs/plugin/relativeTime";

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

// export default function ChatWindow({ peer, socket, onBack = () => {} }) {
//   const { user } = useContext(AuthContext);
//   const [msgs, setMsgs] = useState([]);
//   const [typing, setTyping] = useState(false);
//   const [online, setOnline] = useState(peer?.online || false);
//   const [last, setLast] = useState(peer?.lastSeen || new Date());
//   const [isUserBlocked, setIsUserBlocked] = useState(false);
//   const [showBlockDialog, setShowBlockDialog] = useState(false);
//   const bottom = useRef();
//   const isMobile = useIsMobile();

//   const userId = user?._id?.toString();
//   const peerId = peer?._id?.toString();

//   useEffect(() => {
//     if (!userId || !peerId) return;

//     console.log(`[Socket] User ${userId} joining room`);
//     socket.emit("join", userId);

//     const fetchInitialMessages = async () => {
//       try {
//         const res = await fetchMessages(userId, peerId);
//         setMsgs(res.data.messages);
//       } catch (err) {
//         console.error("Failed to load messages:", err);
//       }
//     };

//     fetchInitialMessages();
//   }, [peerId, userId, socket]);

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

//   useEffect(() => {
//     const recv = (m) => {
//       if (isUserBlocked) {
//         console.log("Blocked user - message ignored");
//         return;
//       }

//       const sender = m.sender.toString();
//       const receiver = m.receiver.toString();

//       if ((sender === peerId && receiver === userId) || (sender === userId && receiver === peerId)) {
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
//   }, [socket, userId, peerId, isUserBlocked]);

//   useEffect(() => {
//     bottom.current?.scrollIntoView({ behavior: "smooth" });
//   }, [msgs]);

//   const send = async (text, file, fileType, content) => {
//     if (isUserBlocked) {
//       console.log("Cannot send message: You are blocked.");
//       return;
//     }

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
//         if (!prev.some((msg) => msg._id === message._id)) {
//           return [...prev, message];
//         }
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

//   const fileURL = (p) => `http://localhost:4000${p}`;

//   const handleLongPress = (id) => {
//     setMsgs((prev) =>
//       prev.map((msg) => (msg._id === id ? { ...msg, marked: !msg.marked } : msg))
//     );
//   };

//   const handleDoubleClick = (id) => {
//     setMsgs((prev) =>
//       prev.map((msg) => (msg._id === id ? { ...msg, marked: !msg.marked } : msg))
//     );
//   };

//   useEffect(() => {
//     const reconnectHandler = () => {
//       console.log("[Socket] Reconnected. Rejoining room...");
//       socket.emit("join", userId);
//     };

//     socket.on("reconnect", reconnectHandler);

//     return () => {
//       socket.off("reconnect", reconnectHandler);
//     };
//   }, [socket, userId]);

//   const ACCENT20 = "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))";
//   const mineStyle = { background: "#FFFFFF", color: "var(--primarySoft)" };
//   const otherStyle = { background: "white", color: "black" };
//   const headLeftStyle = { ...S.headLeft, fontSize: isMobile ? "0.8rem" : S.headLeft.fontSize };
//   const headRightStyle = { ...S.headRight, fontSize: isMobile ? "0.7rem" : S.headRight.fontSize };

//   return (
//     <div style={{ ...S.win, width: isMobile ? "100%" : "auto" }}>
//       <div style={{ ...S.head, background: ACCENT20, color: "var(--textMain)" }}>
//         {isMobile && <button style={S.back} onClick={onBack}>←</button>}
//         <div style={headLeftStyle}>{peer.mobile || peer.username}</div>
//         <CallUI peer={peer} />
//         <button
//           style={{
//             backgroundColor: "green",
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
//             if (isUserBlocked) {
//               handleUnblockUser();
//             } else {
//               setShowBlockDialog(true);
//             }
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
//           position: "fixed",
//           top: "50%",
//           left: "50%",
//           transform: "translate(-50%, -50%)",
//           backgroundColor: "black",
//           color: "white",
//           fontFamily: "var(--font-ui)",
//           padding: "20px",
//           borderRadius: "10px",
//           boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
//           zIndex: 1000,
//           textAlign: "center",
//         }}>
//           <p style={{
//             fontWeight: "bold",
//             fontSize: isMobile ? "0.9rem" : "1rem",
//             margin: "10px 0"
//           }}>
//             Are you sure you want to block this user?
//           </p>
//           <button
//             style={{
//               backgroundColor: "red",
//               color: "white",
//               border: "none",
//               padding: "8px 16px",
//               margin: "5px",
//               borderRadius: "4px",
//               cursor: "pointer",
//               fontWeight: "bold"
//             }}
//             onClick={handleBlockUser}
//           >
//             Yes, Block
//           </button>
//           <button
//             style={{
//               backgroundColor: "green",
//               color: "white",
//               border: "none",
//               padding: "8px 16px",
//               margin: "5px",
//               borderRadius: "4px",
//               cursor: "pointer",
//               fontWeight: "bold"
//             }}
//             onClick={() => setShowBlockDialog(false)}
//           >
//             Cancel
//           </button>
//         </div>
//       )}
//       {typing && (
//         <div style={S.typing}>
//           <i className="fas fa-pen-nib" style={S.icon} /> … typing
//         </div>
//       )}
//       <div style={S.flow}>
//         {msgs.map((m) => {
//           const mine = m.sender.toString() === userId;
//           return (
//             <motion.div
//               key={m._id}
//               style={{
//                 ...S.bubble,
//                 ...(mine ? mineStyle : otherStyle),
//                 alignSelf: mine ? "flex-end" : "flex-start",
//                 backgroundColor: m.marked ? "lightgreen" : (mine ? mineStyle.background : otherStyle.background),
//               }}
//               initial={{ opacity: 0, y: 20 }}
//               animate={{ opacity: 1, y: 0 }}
//               onTouchStart={isMobile ? () => handleLongPress(m._id) : undefined}
//               onDoubleClick={!isMobile ? () => handleDoubleClick(m._id) : undefined}
//             >
//               {m.text && (
//                 <span style={{ ...S.messageText, fontWeight: 'bold', color: 'black' }}>
//                   {m.text}
//                 </span>
//               )}
//               {m.file && m.fileType === "image" && (
//                 <img
//                   src={fileURL(m.file)}
//                   alt="sent"
//                   style={isMobile ? { ...S.thumbnail, maxWidth: 120, maxHeight: 120 } : S.thumbnail}
//                   onClick={() => window.open(fileURL(m.file), "_blank")}
//                 />
//               )}
//               {m.file && m.fileType === "video" && (
//                 <video
//                   style={isMobile ? { ...S.thumbnail, maxWidth: 120, maxHeight: 120 } : S.thumbnail}
//                   controls
//                   onClick={() => window.open(fileURL(m.file), "_blank")}
//                 >
//                   <source src={fileURL(m.file)} type="video/mp4" />
//                 </video>
//               )}
//               {m.file && m.fileType === "audio" && (
//                 <audio controls style={isMobile ? { ...S.audioPlayer, width: 150 } : S.audioPlayer}>
//                   <source src={fileURL(m.file)} type="audio/webm" />
//                 </audio>
//               )}
//               {m.file && m.fileType === "document" && (
//                 <a href={fileURL(m.file)} download style={S.documentLink}>
//                   Download Document
//                 </a>
//               )}
//               {m.fileType === "location" && m.content && (
//                 <div style={isMobile ? { ...S.mapContainer, width: "120px", height: "120px" } : S.mapContainer}>
//                   <iframe
//                     width="160"
//                     height="150"
//                     frameBorder="0"
//                     scrolling="no"
//                     marginHeight="0"
//                     marginWidth="0"
//                     src={`https://maps.google.com/maps?q=${m.content.lat},${m.content.lng}&z=15&output=embed`}
//                   ></iframe>
//                 </div>
//               )}
//               {m.fileType === "contact" && m.content && (
//                 <div style={S.contactBox}>
//                   <p style={{ ...S.contactName, fontWeight: isMobile ? 500 : "bold" }}>{m.content.name}</p>
//                   <p style={S.contactPhone}>{m.content.phone}</p>
//                 </div>
//               )}
//               {m.fileType === "poll" && m.content && (
//                 <div style={S.pollBox}>
//                   <p style={{ ...S.pollQuestion, fontWeight: isMobile ? 500 : "bold" }}>{m.content.question}</p>
//                   <div style={S.pollOptions}>
//                     {m.content.options.map((option, index) => (
//                       <button key={index} style={S.pollOption}>
//                         {option}
//                       </button>
//                     ))}
//                   </div>
//                 </div>
//               )}
//               <span
//                 style={S.star}
//                 onClick={() => toggleStar(m._id, !m.starred)}
//               >
//                 {m.starred ? "⭐" : "☆"}
//               </span>
//             </motion.div>
//           );
//         })}
//         <div ref={bottom} />
//       </div>
//       <MessageInput
//         onSend={send}
//         onTyping={() => {
//           socket.emit("typing", { from: userId, to: peerId });
//         }}
//         disabled={isUserBlocked}
//         placeholder={isUserBlocked ? "This user is blocked. You cannot send messages." : "Type a message"}
//       />
//     </div>
//   );
// }

// const S = {
//   win: {
//     flex: 1,
//     display: "flex",
//     flexDirection: "column",
//     background: "var(--surfaceAlt)",
//     height: "100%",
//     overflow: "hidden",
//     fontFamily: "var(--font-ui)",
//   },
//   head: {
//     padding: "16px 20px",
//     fontWeight: 700,
//     display: "flex",
//     alignItems: "center",
//     gap: 12,
//   },
//   back: {
//     border: "none",
//     background: "transparent",
//     fontSize: "1.6rem",
//     cursor: "pointer",
//     lineHeight: 1,
//     color: "var(--textMain)",
//   },
//   headLeft: {
//     fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
//     flex: 1,
//   },
//   headRight: {
//     fontSize: "clamp(0.85rem, 2.2vw, 1rem)",
//   },
//   typing: {
//     padding: "2px 20px",
//     fontSize: "clamp(0.9rem, 2.3vw, 1rem)",
//     color: "var(--primary)",
//     marginBottom: 8,
//   },
//   icon: { marginRight: 4, fontSize: 14 },
//   flow: {
//     flex: 1,
//     padding: 20,
//     overflowY: "auto",
//     display: "flex",
//     flexDirection: "column",
//     gap: 10,
//     scrollbarWidth: "none",
//     msOverflowStyle: "none",
//     scrollbarColor: "transparent transparent",
//   },
//   bubble: {
//     maxWidth: "70%",
//     padding: "14px 16px",
//     borderRadius: 14,
//     wordBreak: "break-word",
//     boxShadow: "0 3px 6px rgba(0,0,0,.12)",
//     position: "relative",
//   },
//   messageText: {
//     fontSize: "clamp(1.05rem, 2.4vw, 1.15rem)",
//     lineHeight: 1.45,
//   },
//   star: {
//     position: "absolute",
//     bottom: 8,
//     right: 10,
//     cursor: "pointer",
//     userSelect: "none",
//   },
//   thumbnail: {
//     maxWidth: 220,
//     maxHeight: 220,
//     borderRadius: 10,
//     marginTop: 8,
//     cursor: "zoom-in",
//   },
//   audioPlayer: { width: 220, marginTop: 8 },
//   documentLink: {
//     display: "block",
//     marginTop: 8,
//     color: "var(--primary)",
//     textDecoration: "underline",
//     cursor: "pointer",
//   },
//   mapContainer: {
//     width: "200px",
//     height: "200px",
//     margin: "10px 0",
//   },
//   contactBox: {
//     border: "1px solid #ccc",
//     borderRadius: "8px",
//     padding: "10px",
//     backgroundColor: "#f9f9f9",
//     margin: "10px 0",
//   },
//   contactName: {
//     fontWeight: "bold",
//     margin: "5px 0",
//   },
//   contactPhone: {
//     margin: "5px 0",
//     color: "#555",
//   },
//   pollBox: {
//     border: "1px solid #ccc",
//     borderRadius: "8px",
//     padding: "10px",
//     backgroundColor: "#f9f9f9",
//     margin: "10px 0",
//   },
//   pollQuestion: {
//     fontWeight: "bold",
//     margin: "5px 0",
//   },
//   pollOptions: {
//     display: "flex",
//     flexDirection: "column",
//     gap: "5px",
//   },
//   pollOption: {
//     padding: "8px",
//     backgroundColor: "#e0e0e0",
//     border: "none",
//     borderRadius: "4px",
//     cursor: "pointer",
//     textAlign: "center",
//   },
// };



import React, { useState, useEffect, useRef, useContext } from "react";
import { fetchMessages, sendMessage, toggleStar, blockUser, unblockUser } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import MessageInput from "./MessageInput";
import CallUI from "../Call/CallButton";
import { motion } from "framer-motion";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
 // put ping.mp3 in public folder
import socket from "../../socket"; // adjust the path based on your folder structure

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

export default function ChatWindow({ peer, onBack = () => {} }) {
  const { user } = useContext(AuthContext);
  const [msgs, setMsgs] = useState([]);
  const [typing, setTyping] = useState(false);
  const [online, setOnline] = useState(peer?.online || false);
  const [last, setLast] = useState(peer?.lastSeen || new Date());
  const [isUserBlocked, setIsUserBlocked] = useState(false);
  const [showBlockDialog, setShowBlockDialog] = useState(false);
  const bottom = useRef();
  const isMobile = useIsMobile();
 const notificationAudio = useRef(new Audio("/ping.mp3"));
  const userId = user?._id?.toString();
  const peerId = peer?._id?.toString();
const lastSoundTime = useRef(0);

useEffect(() => {
  if (!userId) return;

  console.log(`[Socket] User ${userId} joining room`);
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
}, [userId, peerId, socket]); // keep peerId only for fetching messages

  
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


 useEffect(() => {
  
  const SOUND_INTERVAL = 1200; // 1.2 seconds gap between sounds

  const recv = (m) => {
    if (!m || !m.sender || !m.receiver) return;

    const sender = m.sender?._id?.toString() || m.sender.toString();
    const receiver = m.receiver?._id?.toString() || m.receiver.toString();

    // 🔊 Throttled sound playback — only one ping every 1.2s
    if (receiver === userId && sender === peerId) {
      const now = Date.now();
      if (now - lastSoundTime.current > SOUND_INTERVAL) {
        notificationAudio.current.play().catch(err => console.log(err));
        lastSoundTime.current = now;
      }
    }

    // 💬 Add message if it’s between you and your peer
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
}, [socket, userId, peerId, isUserBlocked]);
// useEffect(() => {
//   const onlineH = (id) => {
//     if (id === peerId) {
//       setOnline(true);
//       setLast(null);
//       setOnlineUsers((prev) => [...new Set([...prev, id])]);
//     }
//   };

//   const offlineH = (id) => {
//     if (id === peerId) {
//       setOnline(false);
//       setLast(new Date());
//       setOnlineUsers((prev) => prev.filter((u) => u !== id));
//     }
//   };

//   socket.on("userOnline", onlineH);
//   socket.on("userOffline", offlineH);

//   return () => {
//     socket.off("userOnline", onlineH);
//     socket.off("userOffline", offlineH);
//   };
// }, [peerId]);
// useEffect(() => {
//   const SOUND_INTERVAL = 1200; // 1.2 seconds gap between sounds

//   const recv = (m) => {
//     if (!m || !m.sender || !m.receiver) return;

//     const sender = m.sender?._id?.toString() || m.sender.toString();
//     const receiver = m.receiver?._id?.toString() || m.receiver.toString();

//     if (receiver === userId && sender === peerId) {
//       const now = Date.now();
//       if (now - lastSoundTime.current > SOUND_INTERVAL) {
//         notificationAudio.current.play().catch(err => console.log(err));
//         lastSoundTime.current = now;
//       }
//     }

//     if (
//       (sender === userId && receiver === peerId) ||
//       (sender === peerId && receiver === userId)
//     ) {
//       setMsgs((prev) => {
//         if (!prev.some((msg) => msg._id === m._id)) {
//           return [...prev, m];
//         }
//         return prev;
//       });
//     }
//   };

//   const typingH = (id) => {
//     if (id === peerId) {
//       setTyping(true);
//       setTimeout(() => setTyping(false), 1500);
//     }
//   };

//   // ✅ Removed the old onlineH/offlineH references here

//   socket.on("receiveMessage", recv);
//   socket.on("peerTyping", typingH);

//   return () => {
//     socket.off("receiveMessage", recv);
//     socket.off("peerTyping", typingH);
//   };
// }, [socket, userId, peerId, isUserBlocked]);

// Separate useEffect for online/offline status
useEffect(() => {
  const onlineH = (id) => {
    if (id === peerId) {
      setOnline(true);
      setLast(null);
      setOnlineUsers((prev) => [...new Set([...prev, id])]);
    }
  };

  const offlineH = (id) => {
    if (id === peerId) {
      setOnline(false);
      setLast(new Date());
      setOnlineUsers((prev) => prev.filter((u) => u !== id));
    }
  };

  socket.on("userOnline", onlineH);
  socket.on("userOffline", offlineH);

  return () => {
    socket.off("userOnline", onlineH);
    socket.off("userOffline", offlineH);
  };
}, [peerId]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth" });
  }, [msgs]);

  const send = async (text, file, fileType, content) => {
    if (isUserBlocked) {
      console.log("Cannot send message: You are blocked.");
      return;
    }

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
        if (!prev.some((msg) => msg._id === message._id)) {
          return [...prev, message];
        }
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

  const handleLongPress = (id) => {
    setMsgs((prev) =>
      prev.map((msg) => (msg._id === id ? { ...msg, marked: !msg.marked } : msg))
    );
  };

  const handleDoubleClick = (id) => {
    setMsgs((prev) =>
      prev.map((msg) => (msg._id === id ? { ...msg, marked: !msg.marked } : msg))
    );
  };

  useEffect(() => {
    const reconnectHandler = () => {
      console.log("[Socket] Reconnected. Rejoining room...");
      socket.emit("join", userId);
    };

    socket.on("reconnect", reconnectHandler);

    return () => {
      socket.off("reconnect", reconnectHandler);
    };
  }, [socket, userId]);

  const ACCENT20 = "color-mix(in srgb, var(--primary) 20%, var(--primarySoft))";
  const mineStyle = { background: "#FFFFFF", color: "var(--primarySoft)" };
  const otherStyle = { background: "white", color: "black" };
  const headLeftStyle = { ...S.headLeft, fontSize: isMobile ? "0.8rem" : S.headLeft.fontSize };
  const headRightStyle = { ...S.headRight, fontSize: isMobile ? "0.7rem" : S.headRight.fontSize };
const [onlineUsers, setOnlineUsers] = useState([]);

  return (
    <div style={{ ...S.win, width: isMobile ? "100%" : "auto" }}>
      <div style={{ ...S.head, background: ACCENT20, color: "var(--textMain)" }}>
        {isMobile && <button style={S.back} onClick={onBack}>←</button>}
        <div style={headLeftStyle}>{peer.mobile || peer.username}</div>
        // <CallUI peer={peer} />
        <CallUI peer={peer} onlineUsers={onlineUsers} />


        <button
          style={{
            backgroundColor: "green",
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
            if (isUserBlocked) {
              handleUnblockUser();
            } else {
              setShowBlockDialog(true);
            }
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
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          backgroundColor: "black",
          color: "white",
          fontFamily: "var(--font-ui)",
          padding: "20px",
          borderRadius: "10px",
          boxShadow: "0 0 10px rgba(0, 0, 0, 0.1)",
          zIndex: 1000,
          textAlign: "center",
        }}>
          <p style={{
            fontWeight: "bold",
            fontSize: isMobile ? "0.9rem" : "1rem",
            margin: "10px 0"
          }}>
            Are you sure you want to block this user?
          </p>
          <button
            style={{
              backgroundColor: "red",
              color: "white",
              border: "none",
              padding: "8px 16px",
              margin: "5px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onClick={handleBlockUser}
          >
            Yes, Block
          </button>
          <button
            style={{
              backgroundColor: "green",
              color: "white",
              border: "none",
              padding: "8px 16px",
              margin: "5px",
              borderRadius: "4px",
              cursor: "pointer",
              fontWeight: "bold"
            }}
            onClick={() => setShowBlockDialog(false)}
          >
            Cancel
          </button>
        </div>
      )}
      {typing && (
        <div style={S.typing}>
          <i className="fas fa-pen-nib" style={S.icon} /> … typing
        </div>
      )}
      <div style={S.flow}>
        {msgs.map((m) => {
          const mine = m.sender.toString() === userId;
          return (
            <motion.div
              key={m._id}
              style={{
                ...S.bubble,
                ...(mine ? mineStyle : otherStyle),
                alignSelf: mine ? "flex-end" : "flex-start",
                backgroundColor: m.marked ? "lightgreen" : (mine ? mineStyle.background : otherStyle.background),
              }}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              onTouchStart={isMobile ? () => handleLongPress(m._id) : undefined}
              onDoubleClick={!isMobile ? () => handleDoubleClick(m._id) : undefined}
            >
              {m.text && (
                <span style={{ ...S.messageText, fontWeight: 'bold', color: 'black' }}>
                  {m.text}
                </span>
              )}
              {m.file && m.fileType === "image" && (
                <img
                  src={fileURL(m.file)}
                  alt="sent"
                  style={isMobile ? { ...S.thumbnail, maxWidth: 120, maxHeight: 120 } : S.thumbnail}
                  onClick={() => window.open(fileURL(m.file), "_blank")}
                />
              )}
              {m.file && m.fileType === "video" && (
                <video
                  style={isMobile ? { ...S.thumbnail, maxWidth: 120, maxHeight: 120 } : S.thumbnail}
                  controls
                  onClick={() => window.open(fileURL(m.file), "_blank")}
                >
                  <source src={fileURL(m.file)} type="video/mp4" />
                </video>
              )}
              {m.file && m.fileType === "audio" && (
                <audio controls style={isMobile ? { ...S.audioPlayer, width: 150 } : S.audioPlayer}>
                  <source src={fileURL(m.file)} type="audio/webm" />
                </audio>
              )}
              {m.file && m.fileType === "document" && (
                <a href={fileURL(m.file)} download style={S.documentLink}>
                  Download Document
                </a>
              )}
              {m.fileType === "location" && m.content && (
                <div style={isMobile ? { ...S.mapContainer, width: "120px", height: "120px" } : S.mapContainer}>
                  <iframe
                    width="100%"
                    height="100%"
                    frameBorder="0"
                    scrolling="no"
                    marginHeight="0"
                    marginWidth="0"
                    src={`https://maps.google.com/maps?q=${m.content.lat},${m.content.lng}&z=15&output=embed`}
                  ></iframe>
                </div>
              )}
              {m.fileType === "contact" && m.content && (
                <div style={S.contactBox}>
                  <p style={{ ...S.contactName, fontWeight: isMobile ? 500 : "bold" }}>{m.content.name}</p>
                  <p style={S.contactPhone}>{m.content.phone}</p>
                </div>
              )}
              {m.fileType === "poll" && m.content && (
                <div style={S.pollBox}>
                  <p style={{ ...S.pollQuestion, fontWeight: isMobile ? 500 : "bold" }}>{m.content.question}</p>
                  <div style={S.pollOptions}>
                    {m.content.options.map((option, index) => (
                      <button key={index} style={S.pollOption}>
                        {option}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          );
        })}
        <div ref={bottom} />
      </div>
      <MessageInput
        onSend={send}
        onTyping={() => {
          socket.emit("typing", { from: userId, to: peerId });
        }}
        disabled={isUserBlocked}
        placeholder={isUserBlocked ? "This user is blocked. You cannot send messages." : "Type a message"}
      />
    </div>
  );
}

const S = {
  win: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    background: "var(--surfaceAlt)",
    height: "100%",
    overflow: "hidden",
    fontFamily: "var(--font-ui)",
  },
  head: {
    padding: "16px 20px",
    fontWeight: 700,
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  back: {
    border: "none",
    background: "transparent",
    fontSize: "1.6rem",
    cursor: "pointer",
    lineHeight: 1,
    color: "var(--textMain)",
  },
  headLeft: {
    fontSize: "clamp(1rem, 2.5vw, 1.25rem)",
    flex: 1,
  },
  headRight: {
    fontSize: "clamp(0.85rem, 2.2vw, 1rem)",
  },
  typing: {
    padding: "2px 20px",
    fontSize: "clamp(0.9rem, 2.3vw, 1rem)",
    color: "var(--primary)",
    marginBottom: 8,
  },
  icon: { marginRight: 4, fontSize: 14 },
  flow: {
    flex: 1,
    padding: 20,
    overflowY: "auto",
    display: "flex",
    flexDirection: "column",
    gap: 10,
    scrollbarWidth: "none",
    msOverflowStyle: "none",
    scrollbarColor: "transparent transparent",
  },
  bubble: {
    maxWidth: "70%",
    padding: "14px 16px",
    borderRadius: 14,
    wordBreak: "break-word",
    boxShadow: "0 3px 6px rgba(0,0,0,.12)",
    position: "relative",
  },
  messageText: {
    fontSize: "clamp(1.05rem, 2.4vw, 1.15rem)",
    lineHeight: 1.45,
  },
  thumbnail: {
    maxWidth: 220,
    maxHeight: 220,
    borderRadius: 10,
    marginTop: 8,
    cursor: "zoom-in",
  },
  audioPlayer: { width: 220, marginTop: 8 },
  documentLink: {
    display: "block",
    marginTop: 8,
    color: "var(--primary)",
    textDecoration: "underline",
    cursor: "pointer",
  },
  mapContainer: {
    width: "200px",
    height: "200px",
    margin: "10px 0",
  },
  contactBox: {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "10px",
    backgroundColor: "#f9f9f9",
    margin: "10px 0",
  },
  contactName: {
    fontWeight: "bold",
    margin: "5px 0",
  },
  contactPhone: {
    margin: "5px 0",
    color: "#555",
  },
  pollBox: {
    border: "1px solid #ccc",
    borderRadius: "8px",
    padding: "10px",
    backgroundColor: "#f9f9f9",
    margin: "10px 0",
  },
  pollQuestion: {
    fontWeight: "bold",
    margin: "5px 0",
  },
  pollOptions: {
    display: "flex",
    flexDirection: "column",
    gap: "5px",
  },
  pollOption: {
    padding: "8px",
    backgroundColor: "#e0e0e0",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    textAlign: "center",
  },
};




















