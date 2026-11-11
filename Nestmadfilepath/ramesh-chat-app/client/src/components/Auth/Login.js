import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  signInWithPopup,
} from "firebase/auth";

import { auth } from "../../firebase";
import api, { login as apiLogin, recoverEmail } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const { login } = useContext(AuthContext);
  const nav = useNavigate();

  const handleLogin = async () => {
    if (!username || !password) return setError("Enter your username and password.");
    try {
      setLoading(true); setError("");
      const email = (await recoverEmail(username.trim())).data.email;
      await signInWithEmailAndPassword(auth, email, password);
      const res = await apiLogin({ username: username.trim().toLowerCase(), password });
      login(res.data);
      nav("/");
    } catch (err) {
      setError(err?.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true); setError("");
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();
      const res = await api.post("/auth/google", { idToken });
      login(res.data);
      nav("/");
    } catch (err) {
      const code = err?.code;
      setError(
        code === "auth/popup-closed-by-user" ? "Google sign-in was cancelled."
        : code === "auth/unauthorized-domain" ? "This website domain is not authorized in your Firebase project."
        : err?.response?.data?.error || err.message || "Google login failed"
      );
    } finally {
      setGoogleLoading(false);
    }
  };

  const busy = loading || googleLoading;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.glow} />
      <div style={styles.card}>
        <div style={styles.logoMark}>S</div>
        <p style={styles.eyebrow}>PRIVATE • CONNECTED • SECURE</p>
        <h2 style={styles.h2}>SURA CHAT</h2>
        <p style={styles.subtitle}>Welcome back. Sign in to continue your conversations.</p>

        <button type="button" style={styles.googleBtn} onClick={handleGoogleLogin} disabled={busy}>
          <span style={styles.googleG}>G</span>
          {googleLoading ? "CONNECTING TO GOOGLE…" : "CONTINUE WITH GOOGLE"}
        </button>

        <div style={styles.separator}><span>OR SIGN IN WITH USERNAME</span></div>

        <label style={styles.label}>USERNAME</label>
        <div style={styles.fieldWrap}>
          <span style={styles.fieldIcon}>@</span>
          <input style={styles.input} placeholder="Enter your username" autoComplete="username"
            value={username} onChange={(e) => setUsername(e.target.value)} disabled={busy} />
        </div>

        <label style={styles.label}>PASSWORD</label>
        <div style={styles.fieldWrap}>
          <span style={styles.fieldIcon}>•</span>
          <input style={styles.input} type={showPassword ? "text" : "password"} placeholder="Enter your password"
            autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleLogin()} disabled={busy} />
          <button type="button" aria-label={showPassword ? "Hide password" : "Show password"}
            onClick={() => setShowPassword((v) => !v)} style={styles.eye}>{showPassword ? "🙈" : "👁"}</button>
        </div>

        {error && <div style={styles.error}>⚠ {error}</div>}

        <button style={styles.btn} onClick={handleLogin} disabled={busy}>
          {loading ? "SIGNING IN…" : "LOG IN"}
        </button>

        <p style={styles.small}><Link style={styles.link} to="/forgot">FORGOT PASSWORD?</Link></p>
        <p style={styles.footer}>NEW TO SURA CHAT? <Link style={styles.link} to="/signup">CREATE ACCOUNT</Link></p>
      </div>
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
    position: "absolute", width: 520, height: 520, borderRadius: "50%", top: -160, right: -120,
    background: "radial-gradient(circle, rgba(207,166,98,.16), transparent 70%)", filter: "blur(30px)", pointerEvents: "none",
  },
  card: {
    width: "100%", maxWidth: 420, padding: "36px 32px", borderRadius: 24,
    background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.13)",
    backdropFilter: "blur(18px)", boxShadow: "0 24px 70px rgba(0,0,0,.42)",
    display: "flex", flexDirection: "column", boxSizing: "border-box", position: "relative", zIndex: 1,
  },
  logoMark: {
    width: 56, height: 56, borderRadius: 18, display: "grid", placeItems: "center", alignSelf: "center",
    background: "linear-gradient(135deg,#e8c98a,#a77a3e)", color: "#101725", fontWeight: 900, fontSize: 21,
    boxShadow: "0 8px 28px rgba(207,166,98,.25)",
  },
  eyebrow: { textAlign: "center", color: "#c9a66b", fontSize: 10, letterSpacing: 2.2, margin: "18px 0 8px" },
  h2: { textAlign: "center", fontSize: "clamp(1.45rem,5vw,1.9rem)", letterSpacing: 1.4, margin: "0 0 8px" },
  subtitle: { textAlign: "center", color: "#aab5c5", fontSize: 13, lineHeight: 1.6, margin: "0 0 24px" },
  googleBtn: {
    width: "100%", minHeight: 50, display: "flex", alignItems: "center", justifyContent: "center", gap: 12,
    borderRadius: 12, border: "1px solid rgba(255,255,255,.2)", background: "#fff", color: "#202938",
    fontWeight: 700, fontSize: 12, letterSpacing: .6, cursor: "pointer", opacity: 1,
  },
  googleG: { fontSize: 19, fontWeight: 900, color: "#4285f4", fontFamily: "Arial,sans-serif" },
  separator: { display: "flex", alignItems: "center", gap: 12, color: "#8491a3", fontSize: 9, letterSpacing: 1.1, margin: "23px 0 18px" },
  separatorBefore: { content: '""' },
  label: { color: "#c4ccd8", fontSize: 10, letterSpacing: 1.2, fontWeight: 700, marginBottom: 8 },
  fieldWrap: {
    display: "flex", alignItems: "center", gap: 8, padding: "0 12px", marginBottom: 16,
    border: "1px solid rgba(255,255,255,.13)", borderRadius: 12, background: "rgba(7,13,24,.58)",
  },
  fieldIcon: { color: "#6f7d93", fontSize: 14 },
  input: {
    flex: 1, minWidth: 0, boxSizing: "border-box", padding: "14px 4px", border: "none", background: "transparent",
    color: "#fff", fontSize: 14, outline: "none",
  },
  eye: { border: 0, background: "transparent", color: "#93a2bd", fontSize: 15, cursor: "pointer", padding: 6 },
  error: {
    padding: "10px 13px", borderRadius: 11, marginBottom: 14, fontSize: 12.5, lineHeight: 1.5,
    background: "rgba(226,72,72,.12)", border: "1px solid rgba(226,72,72,.35)", color: "#ff9c9c",
  },
  btn: {
    width: "100%", padding: "15px 18px", marginTop: 4, border: "none", borderRadius: 12,
    fontWeight: 800, fontSize: 13, letterSpacing: 1,
    background: "linear-gradient(135deg,#e5c487,#b8874d)", color: "#121a27", cursor: "pointer",
  },
  small: { textAlign: "center", margin: "18px 0 0", fontSize: 11 },
  footer: { textAlign: "center", color: "#aab5c5", fontSize: 11, margin: "14px 0 0" },
  link: { color: "#e2c187", textDecoration: "none", fontWeight: 700 },
};
