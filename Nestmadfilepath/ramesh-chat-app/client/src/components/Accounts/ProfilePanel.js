// import React, { useState, useContext, useRef } from "react";
// import { motion } from "framer-motion";
// import { AuthContext } from "../../contexts/AuthContext";
// import { updateProfile } from "../../api";

// export default function ProfilePanel({ onClose }) {
//   const { user, login } = useContext(AuthContext);
//   const [edit, setEdit] = useState(false);
//   const [busy, setBusy] = useState(false);

//   // local state
//   const [name, setName]       = useState(user.name || "");
//   const [mobile, setMobile]   = useState(user.mobile || "");
//   const [about, setAbout]     = useState(user.about || "");
//   const [avatar, setAvatar]   = useState(user.avatar || "");
//   const fileInputRef = useRef();

//   const save = async () => {
//     setBusy(true);
//     try {
//       const id = user._id || user.userId;
//       const fd = new FormData();
//       fd.append("name", name);
//       fd.append("mobile", mobile);
//       fd.append("about", about);
//       if (fileInputRef.current?.files[0]) {
//         fd.append("avatar", fileInputRef.current.files[0]);
//       }

//       const updated = await updateProfile(id, fd);
//       login(updated.data);   // update global state
//       alert("Profile updated ✔");
//       setEdit(false);
//     } catch (e) {
//       alert(e.response?.data?.error || e.message);
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <motion.div
//       initial={{ x: "100%" }}
//       animate={{ x: 0 }}
//       exit={{ x: "100%" }}
//       transition={{ duration: 0.3 }}
//       style={styles.wrap}
//     >
//       <h2>My Account</h2>

//       <div style={styles.avatarWrap}>
//         <img
//           src={avatar || "/avatar-placeholder.png"}
//           alt="Avatar"
//           style={styles.avatar}
//         />
//         {edit && (
//           <input
//             type="file"
//             accept="image/*"
//             ref={fileInputRef}
//             style={styles.fileInput}
//           />
//         )}
//       </div>

//       <div style={styles.read}><b>Username:</b> {user.username}</div>

//       <label>Name</label>
//       <input
//         style={styles.input}
//         value={name}
//         onChange={e => setName(e.target.value)}
//         disabled={!edit}
//       />

//       <label>Mobile</label>
//       <input
//         style={styles.input}
//         value={mobile}
//         onChange={e => setMobile(e.target.value)}
//         disabled={!edit}
//       />

//       <label>About</label>
//       <textarea
//         style={styles.textarea}
//         rows={3}
//         value={about}
//         onChange={e => setAbout(e.target.value)}
//         disabled={!edit}
//       />

//       {!edit ? (
//         <button style={styles.edit} onClick={() => setEdit(true)}>Edit</button>
//       ) : (
//         <button style={styles.save} onClick={save} disabled={busy}>
//           {busy ? "Saving…" : "Save"}
//         </button>
//       )}
//       <button style={styles.close} onClick={onClose}>Close</button>
//     </motion.div>
//   );
// }

// /* ---------- styles ---------- */
// const styles = {
//   wrap: {
//     position: "fixed", top: 0, right: 0, width: 320, height: "100%",
//     background: "#EFE7FD", boxShadow: "-4px 0 12px rgba(0,0,0,.15)",
//     padding: 24, zIndex: 1000, display: "flex", flexDirection: "column",
//     fontFamily: "Inter,sans-serif"
//   },
//   avatarWrap: { marginBottom: 16, textAlign: "center" },
//   avatar: {
//     width: 100, height: 100, borderRadius: "50%", objectFit: "cover",
//     border: "3px solid #6A11CB"
//   },
//   fileInput: { marginTop: 8 },
//   read: { marginBottom: 14 },
//   input: {
//     padding: 8, marginBottom: 12, borderRadius: 6,
//     border: "1px solid #ccc", background: "#fff"
//   },
//   textarea: {
//     padding: 8, marginBottom: 12, borderRadius: 6,
//     border: "1px solid #ccc", resize: "vertical", background: "#fff"
//   },
//   save: {
//     padding: "10px 0", background: "#6A11CB", color: "#fff",
//     border: "none", borderRadius: 6, cursor: "pointer"
//   },
//   edit: {
//     padding: "10px 0", background: "#6A11CB", color: "#fff",
//     border: "none", borderRadius: 6, cursor: "pointer"
//   },
//   close: {
//     marginTop: 8, padding: "8px 0", background: "#fff",
//     border: "1px solid #6A11CB", color: "#6A11CB",
//     borderRadius: 6, cursor: "pointer"
//   }
// };







// import React, { useState, useContext, useRef, useEffect } from "react";
// import { motion } from "framer-motion";
// import { AuthContext } from "../../contexts/AuthContext";
// import { ThemeContext } from "../../contexts/ThemeContext";
// import { THEMES } from "../../themes";
// import { updateProfile } from "../../api";

// const useIsMobile = () => {
//   const [mobile, setMobile] = useState(window.innerWidth <= 768);
//   React.useEffect(() => {
//     const h = () => setMobile(window.innerWidth <= 768);
//     window.addEventListener("resize", h);
//     return () => window.removeEventListener("resize", h);
//   }, []);
//   return mobile;
// };

// export default function ProfilePanel({ onClose }) {
//   const { user, login, logout } = useContext(AuthContext);
//   const { themeKey, setTheme } = useContext(ThemeContext);
//   const isMobile = useIsMobile();
//   const [deletionInfo, setDeletionInfo] = useState(null);
//   const [countdown, setCountdown] = useState("");
//   const [edit, setEdit] = useState(false);
//   const [busy, setBusy] = useState(false);
//   const [showModal, setShowModal] = useState(false);
//   const [recoveryAnswer, setRecoveryAnswer] = useState("");
//   const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
//   const [name, setName] = useState(user.name || "");
//   const [mobileNumber, setMobileN] = useState(user.mobile || "");
//   const [about, setAbout] = useState(user.about || "");
//   const [avatar, setAvatar] = useState(user.avatar || "");
//   const fileInputRef = useRef();

//   const nextTheme = () => {
//     const keys = Object.keys(THEMES);
//     setTheme(keys[(keys.indexOf(themeKey) + 1) % keys.length]);
//   };

//   const save = async () => {
//     setBusy(true);
//     try {
//       const fd = new FormData();
//       fd.append("name", name);
//       fd.append("mobile", mobileNumber);
//       fd.append("about", about);
//       fd.append("recoveryAnswer", recoveryAnswer);
//       if (fileInputRef.current?.files[0]) {
//         fd.append("avatar", fileInputRef.current.files[0]);
//       }
//       const res = await updateProfile(user._id || user.userId, fd);
//       login(res.data);
//       setEdit(false);
//     } catch (e) {
//       alert(e.response?.data?.error || e.message);
//     } finally {
//       setBusy(false);
//     }
//   };

//   useEffect(() => {
//     const fetchDeletion = async () => {
//       try {
//         const res = await fetch(`/api/profile/deleted/${user.username}`);
//         if (res.ok) {
//           const data = await res.json();
//           setDeletionInfo(data);
//         }
//       } catch (err) {
//         console.error("No deletion info");
//       }
//     };
//     fetchDeletion();
//   }, [user.username]);

//   useEffect(() => {
//     if (!deletionInfo) return;
//     const interval = setInterval(() => {
//       const now = new Date();
//       const expiry = new Date(deletionInfo.deletedAt);
//       expiry.setMilliseconds(expiry.getMilliseconds() + deletionInfo.deleteAfterMs);
//       const diff = expiry - now;
//       if (diff <= 0) {
//         clearInterval(interval);
//         setCountdown("Deleted");
//         return;
//       }
//       const h = Math.floor(diff / (1000 * 60 * 60));
//       const m = Math.floor((diff / (1000 * 60)) % 60);
//       const s = Math.floor((diff / 1000) % 60);
//       setCountdown(`${h}h ${m}m ${s}s`);
//     }, 1000);
//     return () => clearInterval(interval);
//   }, [deletionInfo]);

//   const cancelDeletion = async () => {
//     const res = await fetch("/api/profile/cancel-deletion", {
//       method: "POST",
//       headers: {
//         "Content-Type": "application/json",
//       },
//       body: JSON.stringify({ username: user.username }),
//     });
//     if (res.ok) {
//       alert("Deletion canceled!");
//       setDeletionInfo(null);
//     } else {
//       alert("Failed to cancel deletion.");
//     }
//   };

//   const saveRecovery = async () => {
//     try {
//       const res = await updateProfile(user._id || user.userId, { recoveryAnswer });
//       login(res.data);
//       setShowModal(false);
//       alert("Recovery answer saved successfully!");
//     } catch (err) {
//       alert("Failed to save recovery answer.");
//     }
//   };

//   const deleteAccount = async () => {
//     const userId = user._id || user.userId;
//     if (!userId) return alert("User ID not found");

//     try {
//       const res = await fetch("/api/profile/delete-account", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ userId }),
//       });

//       const data = await res.json();
//       if (!res.ok) return alert(data.error || "Failed to delete");

//       alert(data.message);
//       logout();
//       onClose();
//     } catch (err) {
//       alert("Failed to delete account.");
//     }
//   };

//   const headerLabel = name || user.username || "My Account";

//   return (
//     <motion.div
//       initial={{ x: "100%" }}
//       animate={{ x: 0 }}
//       exit={{ x: "100%" }}
//       transition={{ duration: 0.25 }}
//       style={{ ...S.panel, width: isMobile ? "100%" : "30vw" }}
//     >
//       <div style={S.header}>
//         <h2 style={S.h2}>{headerLabel}</h2>
//         <button style={S.closeIcon} onClick={onClose}>
//           ✕
//         </button>
//       </div>
//       <div style={S.body}>
//         <div style={S.avatarWrap}>
//           <img src={avatar || "/avatar-placeholder.png"} alt="avatar" style={S.avatar} />
//           {edit && (
//             <input
//               type="file"
//               accept="image/*"
//               ref={fileInputRef}
//               style={S.fileInput}
//             />
//           )}
//         </div>
//         <div style={S.read}>
//           <b>Username:</b> {user.username}
//         </div>
//         <label style={S.label}>Name</label>
//         <input
//           style={S.input}
//           value={name}
//           onChange={(e) => setName(e.target.value)}
//           disabled={!edit}
//         />
//         <label style={S.label}>Mobile</label>
//         <input
//           style={S.input}
//           value={mobileNumber}
//           onChange={(e) => setMobileN(e.target.value)}
//           disabled={!edit}
//         />
//         <label style={S.label}>About</label>
//         <textarea
//           style={S.textarea}
//           rows={3}
//           value={about}
//           onChange={(e) => setAbout(e.target.value)}
//           disabled={!edit}
//         />
//         {!edit ? (
//           <button style={S.primaryBtn} onClick={() => setEdit(true)}>
//             Edit
//           </button>
//         ) : (
//           <button style={S.primaryBtn} onClick={save} disabled={busy}>
//             {busy ? "Saving…" : "Save"}
//           </button>
//         )}
//         <button style={S.primaryBtn} onClick={() => setShowModal(true)}>
//           Set Recovery Answer
//         </button>
//         {!deletionInfo && (
//           <button style={S.logoutBtn} onClick={() => setShowDeleteConfirm(true)}>
//             Delete Account
//           </button>
//         )}
//         {deletionInfo && (
//           <div style={{ background: "#fee", padding: 12, borderRadius: 8, marginBottom: 10 }}>
//             <p style={{ color: "#a00", marginBottom: 4, fontSize: "0.8rem" }}>
//               ⚠️ Your account is scheduled for deletion in:
//             </p>
//             <p style={{ fontWeight: 600, color: "red", fontSize: "0.8rem" }}>{countdown}</p>
//             <button style={S.primaryBtn} onClick={cancelDeletion}>
//               Cancel Deletion
//             </button>
//           </div>
//         )}
//         <button style={S.secondaryBtn} onClick={nextTheme}>
//           Change Theme
//         </button>
//         <button style={S.logoutBtn} onClick={logout}>
//           Logout
//         </button>
//       </div>
//       {showDeleteConfirm && (
//         <div style={S.modalOverlay}>
//           <div style={S.modal}>
//             <h3 style={{ fontWeight: "bold", color: "black", fontSize: "1rem" }}>Delete Account?</h3>
//             <p style={{ fontWeight: "bold", color: "black", fontSize: "0.8rem" }}>
//               This will delete your account permanently after 48hours
//             </p>
//             <button style={S.primaryBtn} onClick={deleteAccount}>
//               Yes, Delete
//             </button>
//             <button
//               style={S.secondaryBtn}
//               onClick={() => setShowDeleteConfirm(false)}
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}
//       {showModal && (
//         <div style={S.modalOverlay}>
//           <div style={S.modal}>
//             <h3 style={{ fontSize: "1rem" }}>Set Recovery Answer</h3>
//             <p>
//               <b>Question:</b> Who was your favorite teacher?
//             </p>
//             <input
//               style={S.input}
//               placeholder="Type your answer"
//               value={recoveryAnswer}
//               onChange={(e) => setRecoveryAnswer(e.target.value)}
//             />
//             <button style={S.primaryBtn} onClick={saveRecovery}>
//               Save
//             </button>
//             <button
//               style={S.secondaryBtn}
//               onClick={() => setShowModal(false)}
//             >
//               Cancel
//             </button>
//           </div>
//         </div>
//       )}
//     </motion.div>
//   );
// }

// const radius = 8;
// const S = {
//   panel: {
//     position: "fixed",
//     top: 0,
//     right: 0,
//     minWidth: 200,
//     maxWidth: 340,
//     height: "100%",
//     background: "var(--primarySoft)",
//     boxShadow: "-4px 0 20px rgba(0,0,0,.25)",
//     display: "flex",
//     flexDirection: "column",
//     fontFamily: "var(--font-ui)",
//     color: "var(--textMain)",
//     zIndex: 800,
//   },
//   header: {
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     padding: "16px 16px 0",
//   },
//   h2: {
//     margin: 0,
//     fontSize: "1.2rem",
//     fontWeight: 700,
//   },
//   closeIcon: {
//     border: "none",
//     background: "transparent",
//     fontSize: "1.2rem",
//     lineHeight: 1,
//     cursor: "pointer",
//     color: "var(--textMain)",
//   },
//   body: {
//     flex: 1,
//     overflowY: "auto",
//     padding: "0 12px 16px",
//     display: "flex",
//     flexDirection: "column",
//   },
//   avatarWrap: {
//     margin: "0 auto 16px",
//     textAlign: "center",
//   },
//   avatar: {
//     width: 80,
//     height: 80,
//     borderRadius: "50%",
//     objectFit: "cover",
//     border: "2px solid var(--primary)",
//   },
//   fileInput: {
//     marginTop: 8,
//   },
//   read: {
//     marginBottom: 10,
//     fontSize: "0.8rem",
//   },
//   label: {
//     fontSize: "0.8rem",
//     marginBottom: 4,
//   },
//   input: {
//     padding: 8,
//     marginBottom: 10,
//     borderRadius: radius,
//     border: "1px solid var(--primary)",
//     fontSize: "0.8rem",
//   },
//   textarea: {
//     padding: 8,
//     marginBottom: 10,
//     borderRadius: radius,
//     border: "1px solid var(--primary)",
//     resize: "vertical",
//     fontSize: "0.8rem",
//   },
//   primaryBtn: {
//     padding: "6px 0",
//     background: "pink",
//     color: "black",
//     border: "none",
//     borderRadius: radius,
//     fontWeight: 500,
//     fontSize: "0.8rem",
//     cursor: "pointer",
//     marginBottom: 8,
//   },
//   secondaryBtn: {
//     padding: "6px 0",
//     background: "var(--surfaceAlt)",
//     color: "var(--textMain)",
//     border: "none",
//     borderRadius: radius,
//     fontWeight: 500,
//     fontSize: "0.8rem",
//     cursor: "pointer",
//     marginBottom: 8,
//   },
//   logoutBtn: {
//     padding: "6px 0",
//     background: "pink",
//     color: "black",
//     border: "none",
//     borderRadius: radius,
//     fontWeight: 500,
//     fontSize: "0.8rem",
//     cursor: "pointer",
//     marginBottom: 8,
//   },
//   modalOverlay: {
//     position: "fixed",
//     top: 0,
//     left: 0,
//     width: "100vw",
//     height: "100vh",
//     backgroundColor: "rgba(0,0,0,0.5)",
//     zIndex: 1000,
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "center",
//   },
//   modal: {
//     background: "#fff",
//     padding: 16,
//     borderRadius: 8,
//     width: "90%",
//     maxWidth: 300,
//     boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
//     display: "flex",
//     flexDirection: "column",
//   },
// };




import React, { useState, useContext, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { AuthContext } from "../../contexts/AuthContext";
import { ThemeContext } from "../../contexts/ThemeContext";
import { THEMES } from "../../themes";
import { updateProfile } from "../../api";

const useIsMobile = () => {
  const [mobile, setMobile] = useState(window.innerWidth <= 768);
  React.useEffect(() => {
    const h = () => setMobile(window.innerWidth <= 768);
    window.addEventListener("resize", h);
    return () => window.removeEventListener("resize", h);
  }, []);
  return mobile;
};

export default function ProfilePanel({ onClose }) {
  const { user, login, logout } = useContext(AuthContext);
  const { themeKey, setTheme } = useContext(ThemeContext);
  const isMobile = useIsMobile();
  const [deletionInfo, setDeletionInfo] = useState(null);
  const [countdown, setCountdown] = useState("");
  const [edit, setEdit] = useState(false);
  const [busy, setBusy] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showAboutPopup, setShowAboutPopup] = useState(false);
  const [recoveryAnswer, setRecoveryAnswer] = useState("");
  const [name, setName] = useState(user.name || "");
  const [mobileNumber, setMobileN] = useState(user.mobile || "");
  const [about, setAbout] = useState(user.about || "");
  const [avatar, setAvatar] = useState(user.avatar || "");
  const fileInputRef = useRef();

  const nextTheme = () => {
    const keys = Object.keys(THEMES);
    setTheme(keys[(keys.indexOf(themeKey) + 1) % keys.length]);
  };

  const save = async () => {
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("name", name);
      fd.append("mobile", mobileNumber);
      fd.append("about", about);
      fd.append("recoveryAnswer", recoveryAnswer);
      if (fileInputRef.current?.files[0]) {
        fd.append("avatar", fileInputRef.current.files[0]);
      }
      const res = await updateProfile(user._id || user.userId, fd);
      login(res.data);
      setEdit(false);
    } catch (e) {
      alert(e.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const fetchDeletion = async () => {
      try {
        const res = await fetch(`/api/profile/deleted/${user.username}`);
        if (res.ok) {
          const data = await res.json();
          setDeletionInfo(data);
        }
      } catch (err) {
        console.error("No deletion info");
      }
    };
    fetchDeletion();
  }, [user.username]);

  useEffect(() => {
    if (!deletionInfo) return;
    const interval = setInterval(() => {
      const now = new Date();
      const expiry = new Date(deletionInfo.deletedAt);
      expiry.setMilliseconds(expiry.getMilliseconds() + deletionInfo.deleteAfterMs);
      const diff = expiry - now;
      if (diff <= 0) {
        clearInterval(interval);
        setCountdown("Deleted");
        return;
      }
      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff / (1000 * 60)) % 60);
      const s = Math.floor((diff / 1000) % 60);
      setCountdown(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [deletionInfo]);

  const cancelDeletion = async () => {
    const res = await fetch("/api/profile/cancel-deletion", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: user.username }),
    });
    if (res.ok) {
      alert("Deletion canceled!");
      setDeletionInfo(null);
    } else {
      alert("Failed to cancel deletion.");
    }
  };

  const saveRecovery = async () => {
    try {
      const res = await updateProfile(user._id || user.userId, { recoveryAnswer });
      login(res.data);
      setShowModal(false);
      alert("Recovery answer saved successfully!");
    } catch (err) {
      alert("Failed to save recovery answer.");
    }
  };

  const deleteAccount = async () => {
    const userId = user._id || user.userId;
    if (!userId) return alert("User ID not found");

    try {
      const res = await fetch("/api/profile/delete-account", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });

      const data = await res.json();
      if (!res.ok) return alert(data.error || "Failed to delete");

      alert(data.message);
      logout();
      onClose();
    } catch (err) {
      alert("Failed to delete account.");
    }
  };

  const headerLabel = name || user.username || "My Account";

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ duration: 0.25 }}
      style={{ ...S.panel, width: isMobile ? "100%" : "30vw" }}
    >
      <div style={S.header}>
        <h2 style={S.h2}>{headerLabel}</h2>
        <button style={S.closeIcon} onClick={onClose}>
          ✕
        </button>
      </div>
      <div style={S.body}>
        <div style={S.avatarWrap}>
          <img src={avatar || "/avatar-placeholder.png"} alt="avatar" style={S.avatar} />
          {edit && (
            <input
              type="file"
              accept="image/*"
              ref={fileInputRef}
              style={S.fileInput}
            />
          )}
        </div>
        <div style={S.read}>
          <b>Username:</b> {user.username}
        </div>
        <label style={S.label}>Name</label>
        <input
          style={S.input}
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={!edit}
        />
        <label style={S.label}>Mobile</label>
        <input
          style={S.input}
          value={mobileNumber}
          onChange={(e) => setMobileN(e.target.value)}
          disabled={!edit}
        />
        <label style={S.label}>About</label>
        <textarea
          style={S.textarea}
          rows={3}
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          disabled={!edit}
        />
        {!edit ? (
          <button style={S.primaryBtn} onClick={() => setEdit(true)}>
            Edit
          </button>
        ) : (
          <button style={S.primaryBtn} onClick={save} disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </button>
        )}
        <button style={S.primaryBtn} onClick={() => setShowModal(true)}>
          Set Recovery Answer
        </button>
        <button style={S.primaryBtn} onClick={() => setShowAboutPopup(true)}>
          About App
        </button>
        {!deletionInfo && (
          <button style={S.logoutBtn} onClick={() => setShowDeleteConfirm(true)}>
            Delete Account
          </button>
        )}
        {deletionInfo && (
          <div style={{ background: "#fee", padding: 12, borderRadius: 8, marginBottom: 10 }}>
            <p style={{ color: "#a00", marginBottom: 4, fontSize: "0.8rem" }}>
              ⚠️ Your account is scheduled for deletion in:
            </p>
            <p style={{ fontWeight: 600, color: "red", fontSize: "0.8rem" }}>{countdown}</p>
            <button style={S.primaryBtn} onClick={cancelDeletion}>
              Cancel Deletion
            </button>
          </div>
        )}
        <button style={S.secondaryBtn} onClick={nextTheme}>
          Change Theme
        </button>
        <button style={S.logoutBtn} onClick={logout}>
          Logout
        </button>
      </div>

      {showDeleteConfirm && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <h3 style={{ fontWeight: "bold", color: "black", fontSize: "1rem" }}>Delete Account?</h3>
            <p style={{ fontWeight: "bold", color: "black", fontSize: "0.8rem" }}>
              This will delete your account permanently after 48 hours
            </p>
            <button style={S.primaryBtn} onClick={deleteAccount}>
              Yes, Delete
            </button>
            <button style={S.secondaryBtn} onClick={() => setShowDeleteConfirm(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {showModal && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <h3 style={{ fontSize: "1rem" }}>Set Recovery Answer</h3>
            <p><b>Question:</b> Who was your favorite teacher?</p>
            <input
              style={S.input}
              placeholder="Type your answer"
              value={recoveryAnswer}
              onChange={(e) => setRecoveryAnswer(e.target.value)}
            />
            <button style={S.primaryBtn} onClick={saveRecovery}>
              Save
            </button>
            <button style={S.secondaryBtn} onClick={() => setShowModal(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

    {showAboutPopup && (
  <div style={S.modalOverlay}>
    <div
      style={{
        ...S.modal,
        background: "white",
        color: "black",
        fontFamily: "var(--font-ui)",
        fontSize: isMobile ? "0.8rem" : "1rem",
        maxWidth: "500px",
        padding: "20px",
         fontWeight: "bold", // ✅ Added this line
        borderRadius: "12px",
      }}
    >
      <h3 style={{ marginBottom: "12px" }}>📱 About This App</h3>

      <ul style={{ paddingLeft: 20, lineHeight: "1.7" }}>
        <li>👨‍💻 Developed entirely by <strong>Ramesh Sura</strong></li>
        <li>💬 Real-time Chat using WebSocket (Socket.IO)</li>
        <li>📞 Voice Calling with WebRTC-will be released in next version </li>
        <li>🎨 Theme support + Framer Motion animations</li>
        <li>🔐 Secure Login & Profile with Recovery Option</li>
        <li>📂 Media support: send text, files, images</li>
        <li>📲 Mobile-responsive UI and adaptive layout</li>
        <li>🧊 ICE / STUN integration for calling behind NAT</li>
        <li>📤 Upload & Send files with type recognition</li>
        <li>🚫 Block/Unblock users + Smart message filter</li>
        <li>🕵️‍♂️ Message starring + Message highlighting</li>
        <li>🔒 Delete Account & Clear Data Options</li>
        <li>The developer can available for queries, suggestions help, bugs please feel free to reach at G-mail suraramesh46@gmail.com or suraramesh249@gmail.com</li>
      </ul>

      <hr style={{ margin: "15px 0", borderColor: "#555" }} />

      <h4 style={{ margin: "10px 0 5px" }}>📘 How to Use:</h4>
      <ul style={{ paddingLeft: 20, lineHeight: "1.6" }}>
        <li>👥 Search or click on a user to start a chat</li>
        <li>✍️ Type message or attach file & press send</li>
        <li>📞 Press call button (📞) to start a voice call-  should function in next version</li>
        <li>📵 Hang up or decline call anytime</li>
        <li>🔐 Use recovery Q&A in case of forgotten access</li>
        <li>🗑️ Go to settings to delete profile if needed</li>
      </ul>

      <button
        style={{
          ...S.secondaryBtn,
          marginTop: "20px",
          padding: "10px 20px",
          background: "#444",
          color: "#fff",
          borderRadius: "8px",
          cursor: "pointer",
        }}
        onClick={() => setShowAboutPopup(false)}
      >
        ❌ Close
      </button>
    </div>
  </div>
)}

    </motion.div>
  );
}

const radius = 8;
const S = {
  panel: {
    position: "fixed",
    top: 0,
    right: 0,
    minWidth: 200,
    maxWidth: 340,
    height: "100%",
    background: "var(--primarySoft)",
    boxShadow: "-4px 0 20px rgba(0,0,0,.25)",
    display: "flex",
    flexDirection: "column",
    fontFamily: "var(--font-ui)",
    color: "var(--textMain)",
    zIndex: 800,
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "16px 16px 0",
  },
  h2: {
    margin: 0,
    fontSize: "1.2rem",
    fontWeight: 700,
  },
  closeIcon: {
    border: "none",
    background: "transparent",
    fontSize: "1.2rem",
    lineHeight: 1,
    cursor: "pointer",
    color: "var(--textMain)",
  },
  body: {
    flex: 1,
    overflowY: "auto",
    padding: "0 12px 16px",
    display: "flex",
    flexDirection: "column",
  },
  avatarWrap: {
    margin: "0 auto 16px",
    textAlign: "center",
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: "50%",
    objectFit: "cover",
    border: "2px solid var(--primary)",
  },
  fileInput: {
    marginTop: 8,
  },
  read: {
    marginBottom: 10,
    fontSize: "0.8rem",
  },
  label: {
    fontSize: "0.8rem",
    marginBottom: 4,
  },
  input: {
    padding: 8,
    marginBottom: 10,
    borderRadius: radius,
    border: "1px solid var(--primary)",
    fontSize: "0.8rem",
  },
  textarea: {
    padding: 8,
    marginBottom: 10,
    borderRadius: radius,
    border: "1px solid var(--primary)",
    resize: "vertical",
    fontSize: "0.8rem",
  },
  primaryBtn: {
    padding: "6px 0",
    background: "pink",
    color: "black",
    border: "none",
    borderRadius: radius,
    fontWeight: 500,
    fontSize: "0.8rem",
    cursor: "pointer",
    marginBottom: 8,
  },
  secondaryBtn: {
    padding: "6px 0",
    background: "var(--surfaceAlt)",
    color: "var(--textMain)",
    border: "none",
    borderRadius: radius,
    fontWeight: 500,
    fontSize: "0.8rem",
    cursor: "pointer",
    marginBottom: 8,
  },
  logoutBtn: {
    padding: "6px 0",
    background: "pink",
    color: "black",
    border: "none",
    borderRadius: radius,
    fontWeight: 500,
    fontSize: "0.8rem",
    cursor: "pointer",
    marginBottom: 8,
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    width: "100vw",
    height: "100vh",
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 1000,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    background: "#fff",
    padding: 16,
    borderRadius: 8,
    width: "90%",
    maxWidth: 300,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
  },
};
