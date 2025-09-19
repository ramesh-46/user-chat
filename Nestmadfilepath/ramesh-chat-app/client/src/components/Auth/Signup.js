// import React, { useState } from "react";
// import { signup as apiSignup } from "../../api";
// import { Link, useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";

// export default function Signup() {
//   const [mobile, setMobile]     = useState("");
//   const [password, setPassword] = useState("");
//   const nav = useNavigate();

//   const handle = async () => {
//     try {
//       await apiSignup({ mobile, password });
//       alert("Account created – please login");
//       nav("/login");
//     } catch (e) {
//       alert(e.response?.data?.error || "Error");
//     }
//   };

//   return (
//     <motion.div style={styles.box} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
//       <h2 style={{ marginBottom: 24 }}>Create Account</h2>
//       <input style={styles.inp} placeholder="Mobile" value={mobile} onChange={e => setMobile(e.target.value)} />
//       <input style={styles.inp} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
//       <button style={styles.btn} onClick={handle}>Sign up</button>
//       <p style={styles.small}>Have an account? <Link to="/login">Login</Link></p>
//     </motion.div>
//   );
// }

// const primary = "#6A11CB";
// const styles = {
//   box:   { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)", color: "#fff" },
//   inp:   { width: 280, padding: 12, marginBottom: 12, borderRadius: 6, border: "none" },
//   btn:   { width: 280, padding: 12, border: "none", background: "#fff", color: primary, borderRadius: 6, fontWeight: "bold", cursor: "pointer" },
//   small: { marginTop: 12 }
// };
// /* client/src/components/Auth/Signup.jsx-----------------


// import React, { useState } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import { createUserWithEmailAndPassword } from "firebase/auth";

// import { auth }               from "../../firebase";
// import { signup as apiSignup } from "../../api";

// export default function Signup() {
//   const [email,    setEmail]    = useState("");
//   const [password, setPassword] = useState("");
//   const [username, setUsername] = useState("");
//   const [busy,     setBusy]     = useState(false);

//   const nav = useNavigate();

//   const handleSignup = async () => {
//     if (!email || !password || !username)
//       return alert("Please fill all fields");
//     setBusy(true);
//     try {
//       // 1️⃣  create Firebase account
//       const creds   = await createUserWithEmailAndPassword(auth, email, password);
//       const idToken = await creds.user.getIdToken();

//       // 2️⃣  send idToken + username to backend
//       await apiSignup({ idToken, username: username.toLowerCase() });
//       alert("Account created ✔ — log in now");
//       nav("/login");
//     } catch (err) {
//       const msg =
//         err?.response?.data?.error === "Username taken"
//           ? "Username already taken — choose another"
//           : err?.message || "Signup failed";
//       alert(msg);
//     } finally {
//       setBusy(false);
//     }
//   };

//   return (
//     <motion.div style={styles.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
//       <div style={styles.card}>
//         <h2>Create Account</h2>

//         <input
//           style={styles.input}
//           placeholder="Username (lowercase, unique)"
//           value={username}
//           onChange={e => setUsername(e.target.value.replace(/\s+/g, ""))}
//         />
//         <input
//           style={styles.input}
//           type="email"
//           placeholder="E‑mail"
//           value={email}
//           onChange={e => setEmail(e.target.value)}
//         />
//         <input
//           style={styles.input}
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={e => setPassword(e.target.value)}
//         />

//         <button style={styles.btn} onClick={handleSignup} disabled={busy}>
//           {busy ? "Creating…" : "Sign up"}
//         </button>

//         <p style={styles.small}>
//           Have an account? <Link style={styles.link} to="/login">Login</Link>
//         </p>
//       </div>
//     </motion.div>
//   );
// }

// /* ---------- glass‑card inline styles ---------- */
// const primary = "#6A11CB",
//   secondary = "#2575FC",
//   radius = 16;

// const styles = {
//   wrap: {
//     height: "100vh",
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "center",
//     background: `linear-gradient(135deg, ${primary}, ${secondary})`,
//     fontFamily: "Inter, sans-serif",
//     color: "#fff"
//   },
//   card: {
//     width: 320,
//     padding: "32px 28px",
//     borderRadius: radius,
//     background: "rgba(255,255,255,.08)",
//     backdropFilter: "blur(15px)",
//     boxShadow: "0 8px 28px rgba(0,0,0,.25)",
//     display: "flex",
//     flexDirection: "column",
//     alignItems: "center"
//   },
//   input: {
//     width: "100%",
//     padding: "14px 16px",
//     marginBottom: 14,
//     border: "none",
//     borderRadius: radius,
//     fontSize: "1rem",
//     outline: "none"
//   },
//   btn: {
//     width: "100%",
//     padding: "14px 16px",
//     border: "none",
//     borderRadius: radius,
//     fontWeight: 600,
//     fontSize: "1rem",
//     background: "#fff",
//     color: primary,
//     cursor: "pointer"
//   },
//   small: { marginTop: 12, fontSize: ".9rem" },
//   link: { color: "#fff", textDecoration: "underline" }
// };

// src/components/Auth/Login.jsx
// 
// 
// 
// 
// 
// 


import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { signup as apiSignup, recoverEmail } from "../../api";
import { ThemeContext } from "../../contexts/ThemeContext";
import { FaCheckCircle, FaExclamationCircle, FaInfoCircle } from "react-icons/fa";

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [alreadyUser, setAlreadyUser] = useState(false);
  const [popup, setPopup] = useState(null);

  const nav = useNavigate();
  const { theme } = useContext(ThemeContext);

  useEffect(() => {
    const checkUserExists = async () => {
      if (username) {
        try {
          await recoverEmail(username);
          setAlreadyUser(true);
        } catch {
          setAlreadyUser(false);
        }
      }
    };
    checkUserExists();
  }, [username]);

  const showPopup = (type, message) => {
    setPopup({ type, message });
    setTimeout(() => setPopup(null), 3000);
  };

  // const handleSignup = async () => {
  //   if (!email || !password || !username)
  //     return showPopup("error", "Please fill all fields");

  //   if (!agreed)
  //     return showPopup("info", "Please agree to Terms & Conditions");

  //   setBusy(true);
  //   try {
  //     const creds = await createUserWithEmailAndPassword(auth, email, password);
  //     const idToken = await creds.user.getIdToken();
  //     await apiSignup({ idToken, username: username.toLowerCase() });
  //     showPopup("success", "Account created ✔ — Redirecting...");
  //     setTimeout(() => nav("/login"), 2000);
  //   } catch (err) {
  //     const msg =
  //       err?.response?.data?.error === "Username taken"
  //         ? "Username already taken"
  //         : err?.code === "auth/email-already-in-use"
  //         ? "Email already in use"
  //         : err?.code === "auth/weak-password"
  //         ? "Password must be at least 6 characters"
  //         : err?.message || "Signup failed";
  //     showPopup("error", msg);
  //   } finally {
  //     setBusy(false);
  //   }
  // };
const handleSignup = async () => {
  if (!email || !password || !username)
    return showPopup("error", "Please fill all fields");

  if (!agreed)
    return showPopup("info", "Please agree to Terms & Conditions");

  setBusy(true);
  try {
    const creds = await createUserWithEmailAndPassword(auth, email, password);
    const idToken = await creds.user.getIdToken();

    // ✅ Send password to backend too
    await apiSignup({
      idToken,
      username: username.toLowerCase(),
      password: password.trim(),
    });

    showPopup("success", "Account created ✔ — Redirecting...");
    setTimeout(() => nav("/login"), 2000);
  } catch (err) {
    const msg =
      err?.response?.data?.error === "Username taken"
        ? "Username already taken"
        : err?.code === "auth/email-already-in-use"
        ? "Email already in use"
        : err?.code === "auth/weak-password"
        ? "Password must be at least 6 characters"
        : err?.message || "Signup failed";
    showPopup("error", msg);
  } finally {
    setBusy(false);
  }
};

  const renderPopup = () => {
    if (!popup) return null;

    let bgColor = "#fff", color = "#000";
    let Icon = FaInfoCircle;

    if (popup.type === "success") {
      bgColor = "#2ecc71";
      color = "#fff";
      Icon = FaCheckCircle;
    } else if (popup.type === "error") {
      bgColor = "#e74c3c";
      color = "#fff";
      Icon = FaExclamationCircle;
    } else if (popup.type === "info") {
      bgColor = "#ecf0f1";
      color = "#333";
      Icon = FaInfoCircle;
    }

    return (
      <div style={{
        ...styles.popup,
        background: bgColor,
        color,
        borderLeft: `6px solid ${popup.type === "success" ? "#27ae60" : popup.type === "error" ? "#c0392b" : "#3498db"}`
      }}>
        <Icon style={styles.popupIcon} />
        <span style={styles.popupText}>{popup.message}</span>
      </div>
    );
  };

  return (
    <motion.div style={styles.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {renderPopup()}

      <div style={styles.card}>
        <h2 style={styles.h2}>{theme.name} Chat</h2>

        <input
          style={styles.input}
          placeholder="Create a Username"
          value={username}
          onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))}
        />
        <input
          style={styles.input}
          type="email"
          placeholder="G-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div style={styles.terms}>
          <input
            type="checkbox"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
          />
          <span style={styles.termsText}>
            I agree to the{" "}
            <span style={styles.link} onClick={() => setShowTerms(true)}>
              Terms and Conditions
            </span>
          </span>
        </div>

        <button
          style={{
            ...styles.btn,
            background: agreed ? "var(--textMain)" : "#888",
            cursor: agreed ? "pointer" : "not-allowed",
            opacity: busy ? 0.6 : 1,
          }}
          onClick={handleSignup}
          disabled={busy || !agreed}
        >
          {alreadyUser ? "Sign in" : busy ? "Creating…" : "Sign up"}
        </button>

        <p style={styles.small}>
          Already have an account?{" "}
          <Link style={styles.link} to="/login">
            Login
          </Link>
        </p>
      </div>

   {showTerms && (
  <div style={styles.modalOverlay}>
    <div style={styles.modal}>
      <h3>📄 Terms & Conditions</h3>
      <ul style={styles.termsList}>
        <li>👤 <b>Only the user is responsible for the data they share or receive.</b></li>
        <li>👨‍💻 <b>Developers are not liable for any misuse, violation, or illegal activities done by users.</b></li>
        <li>🚫 <b>Strictly no nudity, hate speech, violence, illegal sharing, or harassment.</b></li>
        <li>🔒 <b>All user data is stored securely in MongoDB.</b></li>
        <li>🛠️ <b>This application is a personal project for showcasing skills and not officially registered.</b></li>
        <li>👀 <b>We do not monitor chat or shared files—users are expected to be responsible.</b></li>
        <li>👮 <b>Illegal activity may lead to account ban and report to authorities.</b></li>
        <li>⚠️ <b>We are not responsible for lost data, server errors, or network issues.</b></li>
        <li>✅ <b>Continued use of the app means you agree to these terms.</b></li>
      </ul>

      <div style={{ display: "flex", justifyContent: "center", marginTop: 24 }}>
        <button
          style={{
            backgroundColor: "#4CAF50",
            color: "white",
            padding: "16px 24px",
            borderRadius: 18,
            border: "none",
            fontWeight: 600,
            fontSize: "1.1rem",
            fontFamily: "Inter, sans-serif",
            cursor: "pointer",
            width: "100%",
            maxWidth: 320,
            boxShadow: "0 4px 10px rgba(0,0,0,0.1)",
            transition: "background-color 0.3s ease"
          }}
          onClick={() => setShowTerms(false)}
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}
    </motion.div>
  );
}

const radius = 18;

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "linear-gradient(135deg,var(--primary),var(--primarySoft))",
    fontFamily: "var(--font-ui)",
    color: "var(--textMain)",
    padding: 16,
    position: "relative",
  },
  popup: {
    position: "absolute",
    top: 20,
    left: "50%",
    transform: "translateX(-50%)",
    padding: "12px 18px",
    borderRadius: 12,
    display: "flex",
    alignItems: "center",
    gap: 12,
    boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    zIndex: 1000,
    minWidth: 260,
    maxWidth: 320,
  },
  popupIcon: {
    fontSize: "1.3rem",
  },
  popupText: {
    fontSize: "0.95rem",
    fontWeight: 500,
  },
  card: {
    width: "100%",
    maxWidth: 360,
    padding: "40px 32px",
    borderRadius: radius,
    background: "rgba(255, 255, 255, 0.08)",
    backdropFilter: "blur(14px)",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  h2: {
    fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
    marginBottom: 28,
    letterSpacing: 1,
    fontFamily: "var(--font-ui)",
  },
  input: {
    width: "100%",
    padding: "16px 18px",
    marginBottom: 18,
    border: "none",
    borderRadius: radius,
    fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
    outline: "none",
    fontFamily: "var(--font-ui)",
  },
  btn: {
    width: "100%",
    padding: "16px 18px",
    marginTop: 4,
    border: "none",
    borderRadius: radius,
    fontWeight: 600,
    fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
    color: "var(--primarySoft)",
    fontFamily: "var(--font-ui)",
  },
  small: {
    marginTop: 14,
    fontSize: "clamp(0.85rem, 2vw, 0.95rem)",
  },
  link: {
    color: "var(--textMain)",
    textDecoration: "underline",
    cursor: "pointer",
  },
  terms: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    margin: "12px 0",
  },
  termsText: {
    fontSize: ".9rem",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.5)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  modal: {
    background: "#fff",
    padding: 24,
    borderRadius: radius,
    maxWidth: 500,
    color: "#000",
  },
  termsList: {
    paddingLeft: 18,
    fontSize: ".95rem",
    lineHeight: 1.6,
  },
};
