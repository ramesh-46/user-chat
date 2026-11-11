import React, { useState, useContext, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth } from "../../firebase";
import { signup as apiSignup, recoverEmail } from "../../api";

const strengthOf = (value) => {
  let score = 0;
  if (value.length >= 6) score++;
  if (value.length >= 10) score++;
  if (/[A-Z]/.test(value) && /[a-z]/.test(value)) score++;
  if (/\d/.test(value)) score++;
  if (/[^A-Za-z0-9]/.test(value)) score++;
  return Math.min(score, 4); // 0..4
};

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [alreadyUser, setAlreadyUser] = useState(false);
  const [popup, setPopup] = useState(null);
  const [error, setError] = useState("");

  const nav = useNavigate();

  useEffect(() => {
    const checkUserExists = async () => {
      if (username.length >= 3) {
        try { await recoverEmail(username); setAlreadyUser(true); }
        catch { setAlreadyUser(false); }
      } else setAlreadyUser(false);
    };
    checkUserExists();
  }, [username]);

  const showPopup = (type, message) => {
    setPopup({ type, message });
    setTimeout(() => setPopup(null), 3000);
  };

  const handleSignup = async () => {
    if (!email || !password || !username) return showPopup("error", "Please fill all fields");
    if (!agreed) return showPopup("info", "Please agree to Terms & Conditions");
    setBusy(true); setError("");
    try {
      const creds = await createUserWithEmailAndPassword(auth, email, password);
      const idToken = await creds.user.getIdToken();
      await apiSignup({ idToken, username: username.toLowerCase(), password: password.trim() });
      showPopup("success", "Account created ✔ — Redirecting...");
      setTimeout(() => nav("/login"), 2000);
    } catch (err) {
      const msg =
        err?.response?.data?.error === "Username taken" ? "Username already taken"
        : err?.code === "auth/email-already-in-use" ? "Email already in use"
        : err?.code === "auth/weak-password" ? "Password must be at least 6 characters"
        : err?.message || "Signup failed";
      setError(msg);
      showPopup("error", msg);
    } finally {
      setBusy(false);
    }
  };

  const score = strengthOf(password);
  const strengthLabel = ["Too weak", "Weak", "Okay", "Good", "Strong"][score];

  const renderPopup = () => {
    if (!popup) return null;
    const palette = {
      success: { bg: "#123c2b", border: "#28b879", color: "#7ff0bd" },
      error: { bg: "#40191d", border: "#e05a5a", color: "#ffb3b3" },
      info: { bg: "#1c2c44", border: "#5c86c9", color: "#bcd4f5" },
    }[popup.type] || {};
    return (
      <div style={{ ...styles.popup, background: palette.bg, borderColor: palette.border, color: palette.color }}>
        {popup.type === "success" ? "✔" : popup.type === "error" ? "⚠" : "ℹ"} {popup.message}
      </div>
    );
  };

  return (
    <motion.div style={styles.wrap} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      {renderPopup()}
      <div style={styles.glow} />

      <div style={styles.card}>
        <div style={styles.logoMark}>S</div>
        <p style={styles.eyebrow}>CREATE YOUR ACCOUNT</p>
        <h2 style={styles.h2}>JOIN SURA CHAT</h2>
        <p style={styles.subtitle}>Secure messaging and Google Meet-style video meetings.</p>

        <label style={styles.label}>USERNAME</label>
        <div style={styles.fieldWrap}>
          <span style={styles.fieldIcon}>@</span>
          <input style={styles.input} placeholder="Choose a username" value={username}
            onChange={(e) => setUsername(e.target.value.replace(/\s+/g, ""))} autoCapitalize="none" />
        </div>
        {alreadyUser && <p style={styles.hintWarn}>That username is taken — try another.</p>}

        <label style={styles.label}>EMAIL</label>
        <div style={styles.fieldWrap}>
          <span style={styles.fieldIcon}>✉</span>
          <input style={styles.input} type="email" placeholder="you@gmail.com" value={email}
            onChange={(e) => setEmail(e.target.value)} autoCapitalize="none" />
        </div>

        <label style={styles.label}>PASSWORD</label>
        <div style={styles.fieldWrap}>
          <span style={styles.fieldIcon}>•</span>
          <input style={styles.input} type={showPassword ? "text" : "password"} placeholder="At least 6 characters"
            value={password} onChange={(e) => setPassword(e.target.value)} />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)} style={styles.eye}>{showPassword ? "🙈" : "👁"}</button>
        </div>
        {password && (
          <div style={styles.strengthRow}>
            <div style={styles.strengthTrack}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} style={{ ...styles.strengthBar, background: i < score ? ["#e05a5a", "#e0a04a", "#9bc95c", "#28b879"][score - 1] : "#2a3550" }} />
              ))}
            </div>
            <small style={styles.strengthLabel}>{strengthLabel}</small>
          </div>
        )}

        <label style={styles.terms}>
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span style={styles.termsText}>
            I AGREE TO THE <span style={styles.link} onClick={() => setShowTerms(true)}>TERMS AND CONDITIONS</span>
          </span>
        </label>

        {error && <div style={styles.error}>⚠ {error}</div>}

        <button style={{ ...styles.btn, opacity: busy || !agreed ? .6 : 1 }} onClick={handleSignup} disabled={busy || !agreed}>
          {busy ? "CREATING…" : "CREATE ACCOUNT"}
        </button>

        <p style={styles.small}>ALREADY HAVE AN ACCOUNT? <Link style={styles.link} to="/login">LOGIN</Link></p>
      </div>

      {showTerms && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            <h3 style={{ marginTop: 0 }}>📄 TERMS & CONDITIONS</h3>
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
            <button style={styles.modalClose} onClick={() => setShowTerms(false)}>CLOSE</button>
          </div>
        </div>
      )}
    </motion.div>
  );
}

const styles = {
  wrap: {
    minHeight: "100vh", display: "flex", justifyContent: "center", alignItems: "center",
    background: "radial-gradient(circle at top, #25344b 0%, #111827 45%, #080d16 100%)",
    fontFamily: "var(--font-ui)", color: "#f7f8fb", padding: 20, boxSizing: "border-box",
    position: "relative", overflow: "hidden",
  },
  glow: {
    position: "absolute", width: 520, height: 520, borderRadius: "50%", bottom: -180, left: -140,
    background: "radial-gradient(circle, rgba(128,101,245,.18), transparent 70%)", filter: "blur(30px)", pointerEvents: "none",
  },
  card: {
    width: "100%", maxWidth: 430, padding: "34px 30px", borderRadius: 24,
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)",
    backdropFilter: "blur(18px)", boxShadow: "0 24px 70px rgba(0,0,0,.42)",
    display: "flex", flexDirection: "column", boxSizing: "border-box", position: "relative", zIndex: 1,
  },
  logoMark: {
    width: 54, height: 54, borderRadius: 17, display: "grid", placeItems: "center", alignSelf: "center",
    background: "linear-gradient(135deg,#b9a6ff,#8065f5)", color: "#101725", fontWeight: 900, fontSize: 20,
    boxShadow: "0 8px 28px rgba(128,101,245,.3)",
  },
  eyebrow: { textAlign: "center", color: "#a89bff", fontSize: 10, letterSpacing: 2.2, margin: "16px 0 8px" },
  h2: { textAlign: "center", fontSize: "clamp(1.4rem,5vw,1.8rem)", letterSpacing: 1.4, margin: "0 0 8px" },
  subtitle: { textAlign: "center", color: "#aab5c5", fontSize: 12.5, lineHeight: 1.6, margin: "0 0 20px" },
  label: { color: "#c4ccd8", fontSize: 10, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 },
  fieldWrap: {
    display: "flex", alignItems: "center", gap: 8, padding: "0 12px", marginBottom: 6,
    border: "1px solid rgba(255,255,255,.13)", borderRadius: 12, background: "rgba(7,13,24,.58)",
  },
  fieldIcon: { color: "#6f7d93", fontSize: 14 },
  input: { flex: 1, minWidth: 0, padding: "14px 4px", border: "none", background: "transparent", color: "#fff", fontSize: 14, outline: "none" },
  eye: { border: 0, background: "transparent", color: "#93a2bd", fontSize: 15, cursor: "pointer", padding: 6 },
  hintWarn: { color: "#ffb267", fontSize: 11.5, margin: "2px 4px 8px" },
  strengthRow: { display: "flex", alignItems: "center", gap: 10, margin: "4px 2px 10px" },
  strengthTrack: { display: "flex", gap: 5, flex: 1 },
  strengthBar: { height: 4, flex: 1, borderRadius: 4, background: "#2a3550", transition: "background .25s ease" },
  strengthLabel: { color: "#93a2bd", fontSize: 11, minWidth: 58, textAlign: "right" },
  terms: { display: "flex", alignItems: "center", gap: 9, margin: "14px 0 4px", fontSize: 11.5, color: "#c4ccd8" },
  termsText: { lineHeight: 1.5 },
  error: {
    padding: "10px 13px", borderRadius: 11, margin: "10px 0 4px", fontSize: 12.5, lineHeight: 1.5,
    background: "rgba(226,72,72,.12)", border: "1px solid rgba(226,72,72,.35)", color: "#ff9c9c",
  },
  btn: {
    width: "100%", padding: "15px 18px", marginTop: 12, border: "none", borderRadius: 12,
    fontWeight: 800, fontSize: 13, letterSpacing: 1,
    background: "linear-gradient(135deg,#b9a6ff,#7a5cf0)", color: "#fff", cursor: "pointer",
  },
  small: { textAlign: "center", color: "#aab5c5", fontSize: 11, margin: "16px 0 0" },
  link: { color: "#b9a6ff", textDecoration: "none", fontWeight: 700, cursor: "pointer" },
  popup: {
    position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 1200,
    padding: "12px 18px", borderRadius: 12, border: "1px solid", fontSize: 12.5, fontWeight: 700,
    boxShadow: "0 12px 34px rgba(0,0,0,.4)", maxWidth: "calc(100% - 24px)", textAlign: "center",
  },
  modalOverlay: { position: "fixed", inset: 0, background: "rgba(4,8,15,.7)", display: "grid", placeItems: "center", zIndex: 2000, padding: 16 },
  modal: { background: "#141d31", border: "1px solid #2c3a57", color: "#e7ecf6", padding: 24, borderRadius: 20, maxWidth: 520, width: "100%", maxHeight: "80vh", overflowY: "auto" },
  termsList: { paddingLeft: 18, fontSize: ".85rem", lineHeight: 1.7 },
  modalClose: { backgroundColor: "#8065f5", color: "#fff", padding: "13px 22px", borderRadius: 12, border: "none", fontWeight: 700, cursor: "pointer", width: "100%", marginTop: 18 },
};
