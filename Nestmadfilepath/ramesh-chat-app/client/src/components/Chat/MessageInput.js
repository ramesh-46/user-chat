
import React, { useState, useRef, useCallback } from "react";
import { motion } from "framer-motion";
import Picker from "emoji-picker-react";
import { FaImage, FaVideo, FaFileAlt, FaMapMarkerAlt, FaSmile, FaMicrophone, FaStop, FaPaperPlane, FaTimes } from "react-icons/fa";

export default function MessageInput({ onSend, onTyping, theme = "light" }) {
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
        (error) => console.error("Error getting location:", error)
      );
    } else alert("Geolocation not supported.");
    setShowOptions(false);
  };

  const discardFile = () => {
    setFiles([]);
    setFileType(null);
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const doSend = () => {
    if (!text.trim() && files.length === 0) return;
    if (files.length > 0) {
      files.forEach((file) => {
        if (file.type === "location") onSend(text.trim(), null, "location", JSON.stringify(file));
        else onSend(text.trim(), file, fileType);
      });
    } else onSend(text.trim());
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
    } else onTyping?.();
  };

  const iconSize = 24;
  const styles = {
    bar: {
      display: "flex",
      alignItems: "center",
      gap: 6,
      padding: 8,
      borderTop: `1px solid ${theme === "light" ? "#ddd" : "#444"}`,
      background: theme === "light" ? "#fff" : "#222",
      position: "relative",
      fontFamily: "var(--font-ui)",
      flexWrap: "wrap",
      borderRadius: 25,
      boxShadow: "0 -2px 6px rgba(0,0,0,0.1)",
    },
    picker: {
      position: "absolute",
      bottom: "60px",
      left: 8,
      zIndex: 1000,
    },
    inpContainer: {
      position: "relative",
      flex: 1,
      display: "flex",
      alignItems: "center",
    },
    inp: {
      flex: 1,
      padding: "8px 64px 8px 12px",
      borderRadius: 20,
      border: `1px solid ${theme === "light" ? "#ccc" : "#555"}`,
      resize: "none",
      fontFamily: "var(--font-ui)",
      fontSize: "clamp(0.85rem, 2.8vw, 1.2rem)",
      lineHeight: 1.5,
      background: theme === "light" ? "#f9f9f9" : "#333",
      color: theme === "light" ? "#000" : "#fff",
      fontWeight: "500",
    },
    rightIcons: {
      position: "absolute",
      right: 8,
      display: "flex",
      gap: 8,
      alignItems: "center",
    },
    iconBtn: {
      border: "none",
      background: "transparent",
      fontSize: iconSize,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: 6,
      borderRadius: "50%",
      color: theme === "light" ? "#333" : "#fff",
    },
    send: {
      padding: "10px 16px",
      border: "none",
      borderRadius: 15,
      fontWeight: 600,
      fontSize: "clamp(1rem, 2.5vw, 1.2rem)",
      background: "#4caf50",
      color: "#fff",
      fontFamily: "var(--font-ui)",
      cursor: "pointer",
      marginLeft: 6,
    },
    optionsModal: {
      position: "absolute",
      bottom: "50px",
      left: 0,
      background: theme === "light" ? "#fff" : "#333",
      borderRadius: "12px",
      boxShadow: "0 3px 12px rgba(0,0,0,0.25)",
      padding: "10px",
      zIndex: 1000,
      display: "flex",
      flexDirection: "row",
      gap: 10,
      justifyContent: "center",
    },
    optionIcon: {
      fontSize: 24,
      padding: 10,
      borderRadius: 12,
      cursor: "pointer",
      background: theme === "light" ? "#f0f0f0" : "#444",
      color: theme === "light" ? "#000" : "#fff",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      transition: "0.2s",
    },
    previewContainer: {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: 8,
      background: theme === "light" ? "#f0f0f0" : "#444",
      borderRadius: 12,
      marginBottom: 8,
      position: "relative",
    },
    preview: {
      maxWidth: "120px",
      maxHeight: "120px",
      borderRadius: 8,
      objectFit: "cover",
    },
    discardBtn: {
      position: "absolute",
      top: -8,
      right: -8,
      background: "#ff4444",
      color: "#fff",
      border: "none",
      borderRadius: "50%",
      width: 24,
      height: 24,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      cursor: "pointer",
      fontSize: 12,
    },
    mapContainer: {
      width: "200px",
      height: "120px",
      margin: 5,
      overflow: "hidden",
      borderRadius: 10,
      border: `1px solid ${theme === "light" ? "#ccc" : "#555"}`,
    },
  };

  return (
    <div style={styles.bar}>
      {openEm && (
        <div style={styles.picker}>
          <Picker onEmojiClick={onEmojiClick} theme={theme === "light" ? "light" : "dark"} />
        </div>
      )}
      <button style={styles.iconBtn} onClick={() => setOpenEm((o) => !o)}>
        <FaSmile />
      </button>
      <div style={styles.inpContainer}>
        <textarea
          ref={txtRef}
          style={styles.inp}
          rows={1}
          placeholder="Type a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
        />
        <div style={styles.rightIcons}>
          <div style={styles.iconBtn} onClick={() => setShowOptions((o) => !o)}>
            📎
          </div>
          <div style={styles.iconBtn} onClick={toggleRec}>
            {rec ? <FaStop /> : <FaMicrophone />}
          </div>
        </div>
        {showOptions && (
          <div style={styles.optionsModal}>
            <div
              style={styles.optionIcon}
              title="Image"
              onClick={() => {
                setFileType("image");
                fileRef.current.accept = "image/*";
                fileRef.current.click();
              }}
            >
              <FaImage />
            </div>
            <div
              style={styles.optionIcon}
              title="Video"
              onClick={() => {
                setFileType("video");
                fileRef.current.accept = "video/*";
                fileRef.current.click();
              }}
            >
              <FaVideo />
            </div>
            <div
              style={styles.optionIcon}
              title="Document"
              onClick={() => {
                setFileType("document");
                fileRef.current.accept = ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt";
                fileRef.current.click();
              }}
            >
              <FaFileAlt />
            </div>
            <div style={styles.optionIcon} title="Location" onClick={handleLocationSelect}>
              <FaMapMarkerAlt />
            </div>
          </div>
        )}
      </div>
      {files.length > 0 && (
        <div style={styles.previewContainer}>
          {fileType === "image" && preview && <img src={preview} alt="Preview" style={styles.preview} />}
          {fileType === "video" && <span>🎥 Video selected</span>}
          {fileType === "document" && <span>📄 Document selected</span>}
          {fileType === "location" && (
            <div style={styles.mapContainer}>
              <iframe
                title="map"
                src={`https://www.google.com/maps?q=${files[0].lat},${files[0].lng}&hl=es;z=14&output=embed`}
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
              />
            </div>
          )}
          <button style={styles.discardBtn} onClick={discardFile}>
            <FaTimes />
          </button>
        </div>
      )}
      <motion.button style={styles.send} whileTap={{ scale: 0.9 }} onClick={doSend}>
        <FaPaperPlane />
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
//       gap: 8,
//       padding: 8,
//       borderTop: "1px solid var(--border)",
//       background: "var(--surface)",
//       position: "relative",
//       fontFamily: "var(--font-ui)",
//     },
//     picker: {
//       position: "absolute",
//       bottom: "78px",
//       left: 8,
//       zIndex: 1000,
//     },
//     inp: {
//       flex: 1,
//       padding: "8px 10px",
//       borderRadius: 12,
//       border: "1px solid var(--border)",
//       resize: "none",
//       fontFamily: "var(--font-ui)",
//       fontSize: "clamp(0.8rem, 2.8vw, 1.3rem)",
//       lineHeight: 1.45,
//       background: "#fff",
//       fontWeight: "bold",
//       color: "black",
//           textTransform: "none",

//     },
//     icon: {
//       border: "none",
//       background: "transparent",
//       fontSize: "1.5rem",
//       cursor: "pointer",
//       lineHeight: 1,
//       color: "var(--primary)",
//       padding: "4px",
//       borderRadius: "50%",
//       display: "flex",
//       alignItems: "center",
//       justifyContent: "center",
//     },
//     send: {
//       padding: "10px 16px",
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
//       padding: "8px",
//       cursor: "pointer",
//       borderBottom: "1px solid #eee",
//       textAlign: "center",
//       color: "black",
//       fontWeight: "bold",
//     },
//     preview: {
//       maxWidth: "100px",
//       maxHeight: "100px",
//       margin: "5px",
//     },
//     selectedText: {
//       color: "green",
//       fontWeight: "bold",
//     },
//     mapContainer: {
//       width: "100%",
//       height: "auto",
//       maxHeight: "200px",
//       margin: "5px",
//       overflow: "hidden",
//       borderRadius: "10px",
//     },
//   };

//   const mediaStyles = {
//     "@media (maxWidth: 768px)": {
//       inp: {
//         width: "85vw",
//         padding: "8px 10px",
//         fontSize: "0.7rem",
//       },
//       optionItem: {
//         fontSize: "0.7rem",
//       },
//       mapContainer: {
//         maxHeight: "150px",
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
//         <img src={preview} alt="Preview" style={styles.preview} />
//       )}
//       {fileType === "video" && files.length > 0 && (
//         <div style={{ ...styles.selectedText, ...mediaStyles["@media (maxWidth: 768px)"]?.optionItem }}>
//           🎥 Video selected: {files.length} item{files.length > 1 ? "s" : ""}
//         </div>
//       )}
//       {fileType === "document" && files.length > 0 && (
//         <div style={{ ...styles.selectedText, ...mediaStyles["@media (maxWidth: 768px)"]?.optionItem }}>
//           📄 Document selected: {files.length} item{files.length > 1 ? "s" : ""}
//         </div>
//       )}
//       {fileType === "location" && files.length > 0 && (
//         <div style={{ ...styles.mapContainer, ...mediaStyles["@media (maxWidth: 768px)"]?.mapContainer }}>
//           <iframe
//             title="map"
//             src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3022.2153725795364!2d-73.987844924164!3d40.7484409713896!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x89c259a9b3117469:0xd134e199a4d5!2sEmpire%20State%20Building!5e0!3m2!1sen!2sus!4v1627000000000!5m2!1sen!2sus"
//             width="100%"
//             height="100%"
//             style={{ border: 0 }}
//             allowFullScreen=""
//             loading="lazy"
//           ></iframe>
//         </div>
//       )}
//       {fileType === "audio" && files.length > 0 && (
//         <div style={{ ...styles.selectedText, ...mediaStyles["@media (maxWidth: 768px)"]?.optionItem }}>
//           🎤 Voice message ready to send
//         </div>
//       )}
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



