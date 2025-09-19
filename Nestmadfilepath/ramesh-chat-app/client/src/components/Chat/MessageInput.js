// // client/src/components/Chat/MessageInput.js
// import React, { useState, useRef, useCallback } from "react";
// import { motion } from "framer-motion";
// import Picker from "emoji-picker-react";

// export default function MessageInput({ onSend, onTyping }) {
//   const [text,   setText]   = useState("");
//   const [file,   setFile]   = useState(null);
//   const [rec,    setRec]    = useState(null);
//   const [openEm, setOpenEm] = useState(false);

//   const chunks   = useRef([]);
//   const fileRef  = useRef();
//   const txtRef   = useRef();

//   // Emoji callback: first param is emojiObject
//   const onEmojiClick = useCallback((emojiObject, event) => {
//     setText(t => t + emojiObject.emoji);
//   }, []);

//   // Mic recorder toggle
//   const toggleRec = async () => {
//     if (rec) {
//       rec.stop();
//       setRec(null);
//     } else {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio:true });
//       const r = new MediaRecorder(stream);
//       r.ondataavailable = e => chunks.current.push(e.data);
//       r.onstop = () => {
//         const blob = new Blob(chunks.current, { type: "audio/webm" });
//         chunks.current = [];
//         onSend("", blob, "audio");
//       };
//       r.start();
//       setRec(r);
//     }
//   };

//   // Send text/file
//   const doSend = () => {
//     if (!text.trim() && !file) return;
//     const guessed = file ? file.type.split("/")[0] : null;
//     onSend(text.trim(), file, guessed);
//     setText("");
//     setFile(null);
//     fileRef.current && (fileRef.current.value = "");
//     setOpenEm(false);
//     txtRef.current?.focus();
//   };

//   // Enter to send
//   const handleKey = e => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       doSend();
//     } else {
//       onTyping?.();
//     }
//   };

//   return (
//     <div style={S.bar}>
//       {openEm && (
//         <div style={S.picker}>
//           <Picker onEmojiClick={onEmojiClick} />
//         </div>
//       )}

//       <button style={S.icon} onClick={() => setOpenEm(o => !o)}>😊</button>

//       <textarea
//         ref={txtRef}
//         style={S.inp}
//         rows={1}
//         placeholder="Type a message"
//         value={text}
//         onChange={e => setText(e.target.value)}
//         onKeyDown={handleKey}
//       />

//       <label style={S.icon}>
//         📎
//         <input
//           ref={fileRef}
//           type="file"
//           style={{ display: "none" }}
//           onChange={e => setFile(e.target.files[0])}
//         />
//       </label>

//       <button style={S.icon} onClick={toggleRec}>
//         {rec ? "⏹" : "🎤"}
//       </button>

//       <motion.button style={S.send} whileTap={{ scale: .9 }} onClick={doSend}>
//         Send
//       </motion.button>
//     </div>
//   );
// }

// const S = {
//   bar: {
//     display:"flex", alignItems:"center", gap:8, padding:8,
//     borderTop:"1px solid #D1C4E9", background:"#EDE7F6", position:"relative"
//   },
//   picker: {
//     position:"absolute", bottom:"60px", left:8, zIndex:1000
//   },
//   inp: {
//     flex:1, padding:"10px 12px", borderRadius:8, border:"1px solid #ccc",
//     resize:"none", fontFamily:"inherit", fontSize:15, lineHeight:"20px"
//   },
//   icon: {
//     border:"none", background:"transparent", fontSize:22,
//     cursor:"pointer", lineHeight:"24px"
//   },
//   send: {
//     padding:"10px 16px", border:"none", borderRadius:8, fontWeight:600,
//     background:"#6A11CB", color:"#fff", cursor:"pointer"
//   }
// };



// client/src/components/Chat/MessageInput.js


// import React, { useState, useRef, useCallback } from "react";
// import { motion } from "framer-motion";
// import Picker from "emoji-picker-react";

// export default function MessageInput({ onSend, onTyping }) {
//   const [text, setText] = useState("");
//   const [file, setFile] = useState(null);
//   const [rec, setRec] = useState(null);
//   const [openEm, setOpenEm] = useState(false);

//   const chunks = useRef([]);
//   const fileRef = useRef();
//   const txtRef = useRef();

//   /* ------------- emoji ------------- */
//   const onEmojiClick = useCallback((emojiObject) => {
//     setText((t) => t + emojiObject.emoji);
//   }, []);

//   /* ------------- mic recorder ------------- */
//   const toggleRec = async () => {
//     if (rec) {
//       rec.stop();
//       setRec(null);
//     } else {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       const r = new MediaRecorder(stream);
//       r.ondataavailable = (e) => chunks.current.push(e.data);
//       r.onstop = () => {
//         const blob = new Blob(chunks.current, { type: "audio/webm" });
//         chunks.current = [];
//         onSend("", blob, "audio");
//       };
//       r.start();
//       setRec(r);
//     }
//   };

//   /* ------------- send text/file ------------- */
//   const doSend = () => {
//     if (!text.trim() && !file) return;
//     const guessed = file ? file.type.split("/")[0] : null;
//     onSend(text.trim(), file, guessed);
//     setText("");
//     setFile(null);
//     fileRef.current && (fileRef.current.value = "");
//     setOpenEm(false);
//     txtRef.current?.focus();
//   };

//   /* ------------- keyboard ------------- */
//   const handleKey = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       doSend();
//     } else {
//       onTyping?.();
//     }
//   };

//   /* ------------- ui ------------- */
//   return (
//     <div style={S.bar}>
//       {/* emoji picker */}
//       {openEm && (
//         <div style={S.picker}>
//           <Picker onEmojiClick={onEmojiClick} />
//         </div>
//       )}

//       {/* emoji button */}
//       <button style={S.icon} onClick={() => setOpenEm((o) => !o)}>
//         😊
//       </button>

//       {/* textarea */}
//       <textarea
//         ref={txtRef}
//         style={S.inp}
//         rows={1}
//         placeholder="Type a message"
//         value={text}
//         onChange={(e) => setText(e.target.value)}
//         onKeyDown={handleKey}
//       />

//       {/* attachment */}
//       <label style={S.icon}>
//         📎
//         <input
//           ref={fileRef}
//           type="file"
//           style={{ display: "none" }}
//           onChange={(e) => setFile(e.target.files[0])}
//         />
//       </label>

//       {/* mic */}
//       <button style={S.icon} onClick={toggleRec}>
//         {rec ? "⏹" : "🎤"}
//       </button>

//       {/* send */}
//       <motion.button style={S.send} whileTap={{ scale: 0.9 }} onClick={doSend}>
//         Send
//       </motion.button>
//     </div>
//   );
// }

// /* --------------- theme-aware, responsive styles --------------- */
// const S = {
//   bar: {
//     display: "flex",
//     alignItems: "center",
//     gap: 10,
//     padding: 12,
//     borderTop: "1px solid var(--border)",
//     background: "var(--primarySoft)",
//     position: "relative",
//     fontFamily: "var(--font-ui)",
//   },
//   picker: {
//     position: "absolute",
//     bottom: "70px",
//     left: 12,
//     zIndex: 1000,
//   },
//   inp: {
//     flex: 1,
//     padding: "12px 14px",
//     borderRadius: 10,
//     border: "1px solid var(--border)",
//     resize: "none",
//     fontFamily: "var(--font-ui)",
//     fontSize: "clamp(1rem, 2.4vw, 1.1rem)",
//     lineHeight: "1.4",
//     background: "#fff",
//     color: "var(--textMain)",
//   },
//   icon: {
//     border: "none",
//     background: "transparent",
//     fontSize: "clamp(1.4rem, 3vw, 1.7rem)",
//     cursor: "pointer",
//     lineHeight: 1,
//     color: "var(--primary)",
//   },
//   send: {
//     padding: "12px 18px",
//     border: "none",
//     borderRadius: 10,
//     fontWeight: 600,
//     fontSize: "clamp(1rem, 2.4vw, 1.1rem)",
//     background: "var(--primary)",
//     color: "var(--primarySoft)",
//     fontFamily: "var(--font-ui)",
//     cursor: "pointer",
//   },
// };
// src/components/Chat/MessageInput.js
// MessageInput.js
// 
// 







// import React, { useState, useRef, useCallback } from "react";
// import { motion } from "framer-motion";
// import Picker from "emoji-picker-react";

// export default function MessageInput({ onSend, onTyping }) {
//   const [text, setText] = useState("");
//   const [files, setFiles] = useState([]);
//   const [fileType, setFileType] = useState(null);
//   const [preview, setPreview] = useState(null);
//   const [showOptions, setShowOptions] = useState(false);
//   const [rec, setRec] = useState(null);
//   const [openEm, setOpenEm] = useState(false);

//   const chunks = useRef([]);
//   const fileRef = useRef();
//   const txtRef = useRef();

//   const onEmojiClick = useCallback((e) => setText((t) => t + e.emoji), []);

//   const toggleRec = async () => {
//     if (rec) {
//       rec.stop();
//       setRec(null);
//     } else {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       const r = new MediaRecorder(stream);
//       r.ondataavailable = (e) => chunks.current.push(e.data);
//       r.onstop = () => {
//         const blob = new Blob(chunks.current, { type: "audio/webm" });
//         chunks.current = [];
//         setFiles([blob]);
//         setFileType("audio");
//       };
//       r.start();
//       setRec(r);
//     }
//   };

//   const handleFileChange = (e, type) => {
//     const selectedFiles = Array.from(e.target.files);
//     setFiles(selectedFiles);
//     setFileType(type);
//     if (type === "image" && selectedFiles.length > 0) {
//       const reader = new FileReader();
//       reader.onload = (event) => {
//         setPreview(event.target.result);
//       };
//       reader.readAsDataURL(selectedFiles[0]);
//     }
//   };

//   const handleLocationSelect = () => {
//     if (navigator.geolocation) {
//       navigator.geolocation.getCurrentPosition(
//         (position) => {
//           const { latitude, longitude } = position.coords;
//           const location = { type: "location", lat: latitude, lng: longitude };
//           setFiles([location]);
//           setFileType("location");
//         },
//         (error) => {
//           console.error("Error getting location:", error);
//         }
//       );
//     } else {
//       alert("Geolocation is not supported by this browser.");
//     }
//     setShowOptions(false);
//   };

//   const doSend = () => {
//     if (!text.trim() && files.length === 0) return;

//     if (files.length > 0) {
//       files.forEach((file) => {
//         if (file.type === "location") {
//           onSend(text.trim(), null, "location", JSON.stringify(file));
//         } else {
//           onSend(text.trim(), file, fileType);
//         }
//       });
//     } else {
//       onSend(text.trim());
//     }

//     setText("");
//     setFiles([]);
//     setPreview(null);
//     setFileType(null);
//     if (fileRef.current) fileRef.current.value = "";
//     setOpenEm(false);
//     txtRef.current?.focus();
//   };

//   const handleKey = (e) => {
//     if (e.key === "Enter" && !e.shiftKey) {
//       e.preventDefault();
//       doSend();
//     } else {
//       onTyping?.();
//     }
//   };

//   const styles = {
//     bar: {
//       display: "flex",
//       alignItems: "center",
//       gap: 12,
//       padding: 14,
//       borderTop: "1px solid var(--border)",
//       background: "var(--surface)",
//       position: "relative",
//       fontFamily: "var(--font-ui)",
//     },
//     picker: {
//       position: "absolute",
//       bottom: "78px",
//       left: 14,
//       zIndex: 1000,
//     },
//     inp: {
//       flex: 1,
//       padding: "14px 16px",
//       borderRadius: 12,
//       border: "1px solid var(--border)",
//       resize: "none",
//       fontFamily: "var(--font-ui)",
//       fontSize: "clamp(0.8rem, 2.8vw, 1.3rem)",
//       lineHeight: "1.45",
//       background: "#fff",
//       fontWeight: "bold",
//       color: "black",
//     },
//     icon: {
//       border: "none",
//       background: "transparent",
//       fontSize: "1.5rem",
//       cursor: "pointer",
//       lineHeight: 1,
//       color: "var(--primary)",
//       padding: "8px",
//       borderRadius: "50%",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//     },
//     send: {
//       padding: "14px 20px",
//       border: "none",
//       borderRadius: 12,
//       fontWeight: 600,
//       fontSize: "clamp(1.1rem, 2.6vw, 1.25rem)",
//       background: "lightgreen",
//       color: "var(--primarySoft)",
//       fontFamily: "var(--font-ui)",
//       cursor: "pointer",
//     },
//     optionsModal: {
//       position: "absolute",
//       bottom: "60px",
//       left: "10px",
//       background: "white",
//       borderRadius: "10px",
//       boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
//       padding: "10px",
//       zIndex: 1000,
//       display: "flex",
//       flexDirection: "column",
      
//       fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
//     },
//     optionItem: {
//   padding: "10px",
//   cursor: "pointer",
//   borderBottom: "1px solid #eee",
//   textAlign: "center",
//   color: "black",
//   fontWeight: "bold",
// },

//     preview: {
//       maxWidth: "100px",
//       maxHeight: "100px",
//       margin: "10px",
//     },
//   };

//   const mediaStyles = {
//     "@media (maxWidth: 768px)": {
//       inp: {
//         width: "70vw",
//         padding: "10px 12px",
//       },
//     },
//   };

//   return (
//     <div style={styles.bar}>
//       {openEm && (
//         <div style={styles.picker}>
//           <Picker onEmojiClick={onEmojiClick} />
//         </div>
//       )}
//       <button style={styles.icon} onClick={() => setOpenEm((o) => !o)}>
//         😊
//       </button>
//       <textarea
//         ref={txtRef}
//         style={{ ...styles.inp, ...mediaStyles["@media (maxWidth: 768px)"]?.inp }}
//         rows={1}
//         placeholder="Type a message"
//         value={text}
//         onChange={(e) => setText(e.target.value)}
//         onKeyDown={handleKey}
//       />
//       <div style={styles.icon} onClick={() => setShowOptions(!showOptions)}>
//         📎
//       </div>
//       {showOptions && (
//         <div style={styles.optionsModal}>
//           <div
//             style={styles.optionItem}
//             onClick={() => {
//               setFileType("image");
//               fileRef.current.accept = "image/*";
//               fileRef.current.click();
//             }}
//           >
//             Image
//           </div>
//           <div
//             style={styles.optionItem}
//             onClick={() => {
//               setFileType("video");
//               fileRef.current.accept = "video/*";
//               fileRef.current.click();
//             }}
//           >
//             Video
//           </div>
//           <div
//             style={styles.optionItem}
//             onClick={() => {
//               setFileType("document");
//               fileRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
//               fileRef.current.click();
//             }}
//           >
//             Document
//           </div>
//           <div style={styles.optionItem} onClick={handleLocationSelect}>
//             Location
//           </div>
//         </div>
//       )}
//       {fileType === "image" && preview && (
//   <img src={preview} alt="Preview" style={styles.preview} />
// )}

// {fileType === "video" && files.length > 0 && (
//   <div style={{ color: "#333", margin: "10px", fontSize: "0.95rem" }}>
//     🎥 Video selected: {files.length} item{files.length > 1 ? "s" : ""}
//   </div>
// )}

// {fileType === "document" && files.length > 0 && (
//   <div style={{ color: "#333", margin: "10px", fontSize: "0.95rem" }}>
//     📄 Document selected: {files.length} item{files.length > 1 ? "s" : ""}
//   </div>
// )}

// {fileType === "location" && files.length > 0 && (
//   <div style={{ color: "#333", margin: "10px", fontSize: "0.95rem" }}>
//     📍 Location attached
//   </div>
// )}

// {fileType === "audio" && files.length > 0 && (
//   <div style={{ color: "#333", margin: "10px", fontSize: "0.95rem" }}>
//     🎤 Voice message ready to send
//   </div>
// )}

//       <button style={styles.icon} onClick={toggleRec}>
//         {rec ? "⏹" : "🎤"}
//       </button>
//       <motion.button style={styles.send} whileTap={{ scale: 0.9 }} onClick={doSend}>
//         Send
//       </motion.button>
//       <input
//         ref={fileRef}
//         type="file"
//         style={{ display: "none" }}
//         multiple
//         onChange={(e) => handleFileChange(e, fileType)}
//       />
//     </div>
//   );
// }








import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Picker from "emoji-picker-react";

export default function MessageInput({ onSend, onTyping }) {
  const [text, setText] = useState("");
  const [files, setFiles] = useState([]);
  const [fileType, setFileType] = useState(null);
  const [preview, setPreview] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [rec, setRec] = useState(null);
  const [openEm, setOpenEm] = useState(false);

  const chunks = useRef([]);
  const fileRef = useRef();
  const txtRef = useRef();

  const onEmojiClick = useCallback((e) => setText((t) => t + e.emoji), []);

  const toggleRec = async () => {
    if (rec) {
      rec.stop();
      setRec(null);
    } else {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const r = new MediaRecorder(stream);
      r.ondataavailable = (e) => chunks.current.push(e.data);
      r.onstop = () => {
        const blob = new Blob(chunks.current, { type: "audio/webm" });
        chunks.current = [];
        setFiles([blob]);
        setFileType("audio");
      };
      r.start();
      setRec(r);
    }
  };

  const handleFileChange = (e, type) => {
    const selectedFiles = Array.from(e.target.files);
    setFiles(selectedFiles);
    setFileType(type);
    if (type === "image" && selectedFiles.length > 0) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setPreview(event.target.result);
      };
      reader.readAsDataURL(selectedFiles[0]);
    }
  };

  const handleLocationSelect = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          const location = { type: "location", lat: latitude, lng: longitude };
          setFiles([location]);
          setFileType("location");
        },
        (error) => {
          console.error("Error getting location:", error);
        }
      );
    } else {
      alert("Geolocation is not supported by this browser.");
    }
    setShowOptions(false);
  };

  const doSend = () => {
    if (!text.trim() && files.length === 0) return;

    if (files.length > 0) {
      files.forEach((file) => {
        if (file.type === "location") {
          onSend(text.trim(), null, "location", JSON.stringify(file));
        } else {
          onSend(text.trim(), file, fileType);
        }
      });
    } else {
      onSend(text.trim());
    }

    setText("");
    setFiles([]);
    setPreview(null);
    setFileType(null);
    if (fileRef.current) fileRef.current.value = "";
    setOpenEm(false);
    txtRef.current?.focus();
  };

  const handleKey = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      doSend();
    } else {
      onTyping?.();
    }
  };

  const styles = {
    bar: {
      display: "flex",
      alignItems: "center",
      gap: 8,
      padding: 8,
      borderTop: "1px solid var(--border)",
      background: "var(--surface)",
      position: "relative",
      fontFamily: "var(--font-ui)",
    },
    picker: {
      position: "absolute",
      bottom: "78px",
      left: 8,
      zIndex: 1000,
    },
    inp: {
      flex: 1,
      padding: "8px 10px",
      borderRadius: 12,
      border: "1px solid var(--border)",
      resize: "none",
      fontFamily: "var(--font-ui)",
      fontSize: "clamp(0.8rem, 2.8vw, 1.3rem)",
      lineHeight: 1.45,
      background: "#fff",
      fontWeight: "bold",
      color: "black",
    },
    icon: {
      border: "none",
      background: "transparent",
      fontSize: "1.5rem",
      cursor: "pointer",
      lineHeight: 1,
      color: "var(--primary)",
      padding: "4px",
      borderRadius: "50%",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    },
    send: {
      padding: "10px 16px",
      border: "none",
      borderRadius: 12,
      fontWeight: 600,
      fontSize: "clamp(1.1rem, 2.6vw, 1.25rem)",
      background: "lightgreen",
      color: "var(--primarySoft)",
      fontFamily: "var(--font-ui)",
      cursor: "pointer",
    },
    optionsModal: {
      position: "absolute",
      bottom: "60px",
      left: "10px",
      background: "white",
      borderRadius: "10px",
      boxShadow: "0 2px 10px rgba(0,0,0,0.2)",
      padding: "10px",
      zIndex: 1000,
      display: "flex",
      flexDirection: "column",
      fontSize: "clamp(0.7rem, 2vw, 0.9rem)",
    },
    optionItem: {
      padding: "8px",
      cursor: "pointer",
      borderBottom: "1px solid #eee",
      textAlign: "center",
      color: "black",
      fontWeight: "bold",
    },
    preview: {
      maxWidth: "100px",
      maxHeight: "100px",
      margin: "5px",
    },
    selectedText: {
      color: "green",
      fontWeight: "bold",
    },
    mapContainer: {
      width: "100%",
      height: "auto",
      maxHeight: "200px",
      margin: "5px",
      overflow: "hidden",
      borderRadius: "10px",
    },
  };

  const mediaStyles = {
    "@media (maxWidth: 768px)": {
      inp: {
        width: "85vw",
        padding: "8px 10px",
        fontSize: "0.7rem",
      },
      optionItem: {
        fontSize: "0.7rem",
      },
      mapContainer: {
        maxHeight: "150px",
      },
    },
  };

  return (
    <div style={styles.bar}>
      {openEm && (
        <div style={styles.picker}>
          <Picker onEmojiClick={onEmojiClick} />
        </div>
      )}
      <button style={styles.icon} onClick={() => setOpenEm((o) => !o)}>
        😊
      </button>
      <textarea
        ref={txtRef}
        style={{ ...styles.inp, ...mediaStyles["@media (maxWidth: 768px)"]?.inp }}
        rows={1}
        placeholder="Type a message"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={handleKey}
      />
      <div style={styles.icon} onClick={() => setShowOptions(!showOptions)}>
        📎
      </div>
      {showOptions && (
        <div style={styles.optionsModal}>
          <div
            style={styles.optionItem}
            onClick={() => {
              setFileType("image");
              fileRef.current.accept = "image/*";
              fileRef.current.click();
            }}
          >
            Image
          </div>
          <div
            style={styles.optionItem}
            onClick={() => {
              setFileType("video");
              fileRef.current.accept = "video/*";
              fileRef.current.click();
            }}
          >
            Video
          </div>
          <div
            style={styles.optionItem}
            onClick={() => {
              setFileType("document");
              fileRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
              fileRef.current.click();
            }}
          >
            Document
          </div>
          <div style={styles.optionItem} onClick={handleLocationSelect}>
            Location
          </div>
        </div>
      )}
      {fileType === "image" && preview && (
        <img src={preview} alt="Preview" style={styles.preview} />
      )}
      {fileType === "video" && files.length > 0 && (
        <div style={{ ...styles.selectedText, ...mediaStyles["@media (maxWidth: 768px)"]?.optionItem }}>
          🎥 Video selected: {files.length} item{files.length > 1 ? "s" : ""}
        </div>
      )}
      {fileType === "document" && files.length > 0 && (
        <div style={{ ...styles.selectedText, ...mediaStyles["@media (maxWidth: 768px)"]?.optionItem }}>
          📄 Document selected: {files.length} item{files.length > 1 ? "s" : ""}
        </div>
      )}
      {fileType === "location" && files.length > 0 && (
        <div style={{ ...styles.mapContainer, ...mediaStyles["@media (maxWidth: 768px)"]?.mapContainer }}>
          <iframe
            title="map"
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.2153725795364!2d-73.987844924164!3d40.7484409713896!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259a9b3117469:0xd134e199a4d5!2sEmpire%20State%20Building!5e0!3m2!1sen!2sus!4v1627000000000!5m2!1sen!2sus"
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen=""
            loading="lazy"
          ></iframe>
        </div>
      )}
      {fileType === "audio" && files.length > 0 && (
        <div style={{ ...styles.selectedText, ...mediaStyles["@media (maxWidth: 768px)"]?.optionItem }}>
          🎤 Voice message ready to send
        </div>
      )}
      <button style={styles.icon} onClick={toggleRec}>
        {rec ? "⏹" : "🎤"}
      </button>
      <motion.button style={styles.send} whileTap={{ scale: 0.9 }} onClick={doSend}>
        Send
      </motion.button>
      <input
        ref={fileRef}
        type="file"
        style={{ display: "none" }}
        multiple
        onChange={(e) => handleFileChange(e, fileType)}
      />
    </div>
  );
}
