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

  const handleSignup = async () => {
    if (!email || !password || !username)
      return showPopup("error", "Please fill all fields");

    if (!agreed)
      return showPopup("info", "Please agree to Terms & Conditions");

    setBusy(true);
    try {
      const creds = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await creds.user.getIdToken();

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
        <span style={styles.popupText}>{popup.message.toUpperCase()}</span>
      </div>
    );
  };

  return (
    <motion.div style={styles.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {renderPopup()}

      <div style={styles.card}>
        <h2 style={styles.h2}>BLACK PEARL CHAT</h2>

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
            I AGREE TO THE{" "}
            <span style={styles.link} onClick={() => setShowTerms(true)}>
              TERMS AND CONDITIONS
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
          {alreadyUser ? "SIGN IN" : busy ? "CREATING…" : "SIGN UP"}
        </button>

        <p style={styles.small}>
          ALREADY HAVE AN ACCOUNT?{" "}
          <Link style={styles.link} to="/login">
            LOGIN
          </Link>
        </p>
      </div>

      {showTerms && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3>📄 TERMS & CONDITIONS</h3>
            <ul style={styles.termsList}>
              <li>👤 <b>ONLY THE USER IS RESPONSIBLE FOR THE DATA THEY SHARE OR RECEIVE.</b></li>
              <li>👨‍💻 <b>DEVELOPERS ARE NOT LIABLE FOR ANY MISUSE, VIOLATION, OR ILLEGAL ACTIVITIES DONE BY USERS.</b></li>
              <li>🚫 <b>STRICTLY NO NUDITY, HATE SPEECH, VIOLENCE, ILLEGAL SHARING, OR HARASSMENT.</b></li>
              <li>🔒 <b>ALL USER DATA IS STORED SECURELY IN MONGODB.</b></li>
              <li>🛠️ <b>THIS APPLICATION IS A PERSONAL PROJECT FOR SHOWCASING SKILLS AND NOT OFFICIALLY REGISTERED.</b></li>
              <li>👀 <b>WE DO NOT MONITOR CHAT OR SHARED FILES—USERS ARE EXPECTED TO BE RESPONSIBLE.</b></li>
              <li>👮 <b>ILLEGAL ACTIVITY MAY LEAD TO ACCOUNT BAN AND REPORT TO AUTHORITIES.</b></li>
              <li>⚠️ <b>WE ARE NOT RESPONSIBLE FOR LOST DATA, SERVER ERRORS, OR NETWORK ISSUES.</b></li>
              <li>✅ <b>CONTINUED USE OF THE APP MEANS YOU AGREE TO THESE TERMS.</b></li>
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
                CLOSE
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
    textTransform: "uppercase"
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
    textTransform: "uppercase",
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
    textTransform: "none", // input stays normal
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
    textTransform: "uppercase",
  },
  termsList: {
    paddingLeft: 18,
    fontSize: ".95rem",
    lineHeight: 1.6,
  },
};
