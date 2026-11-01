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
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const nav = useNavigate();

  // Existing username + password login remains unchanged.
  const handleLogin = async () => {
    if (!username || !password) return alert("Fill both fields");
    try {
      setLoading(true);
      const email = (await recoverEmail(username.trim())).data.email;
      await signInWithEmailAndPassword(auth, email, password);
      const res = await apiLogin({
        username: username.trim().toLowerCase(),
        password,
      });
      login(res.data);
      nav("/");
    } catch (err) {
      alert(err?.response?.data?.error || err.message || "Login failed");
    } finally {
      setLoading(false);
    }
  };

  // Google uses the same Firebase project and the same MongoDB chat profile.
  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: "select_account" });
      const credential = await signInWithPopup(auth, provider);
      const idToken = await credential.user.getIdToken();
      const res = await apiLoginWithGoogle(idToken);
      login(res.data);
      nav("/");
    } catch (err) {
      const code = err?.code;
      const message =
        code === "auth/popup-closed-by-user"
          ? "Google sign-in was cancelled."
          : code === "auth/unauthorized-domain"
          ? "This website domain is not authorized in your existing Firebase project."
          : err?.response?.data?.error || err.message || "Google login failed";
      alert(message);
    } finally {
      setGoogleLoading(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={styles.wrap}>
      <div style={styles.card}>
        <div style={styles.logoMark}>BP</div>
        <p style={styles.eyebrow}>PRIVATE • CONNECTED • SECURE</p>
        <h2 style={styles.h2}>BLACK PEARL CHAT</h2>
        <p style={styles.subtitle}>Welcome back. Sign in to continue your conversations.</p>

        <button
          type="button"
          style={styles.googleBtn}
          onClick={handleGoogleLogin}
          disabled={loading || googleLoading}
        >
          <span style={styles.googleG}>G</span>
          {googleLoading ? "CONNECTING TO GOOGLE..." : "CONTINUE WITH GOOGLE"}
        </button>

        <div style={styles.separator}><span>OR SIGN IN WITH USERNAME</span></div>

        <label style={styles.label}>USERNAME</label>
        <input
          style={styles.input}
          placeholder="Enter your username"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          disabled={loading || googleLoading}
        />
        <label style={styles.label}>PASSWORD</label>
        <input
          style={styles.input}
          type="password"
          placeholder="Enter your password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          disabled={loading || googleLoading}
        />

        <button style={styles.btn} onClick={handleLogin} disabled={loading || googleLoading}>
          {loading ? "SIGNING IN..." : "LOG IN"}
        </button>

        <p style={styles.small}>
          <Link style={styles.link} to="/forgot">FORGOT PASSWORD?</Link>
        </p>
        <p style={styles.footer}>
          NEW TO BLACK PEARL? <Link style={styles.link} to="/signup">CREATE ACCOUNT</Link>
        </p>
      </div>
    </motion.div>
  );
}

// Keep the Google endpoint separate from the existing username/password endpoint.
async function apiLoginWithGoogle(idToken) {
  return api.post("/auth/google", { idToken });
}

const styles = {
  wrap: {
    minHeight: "100vh",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    background: "radial-gradient(circle at top, #25344b 0%, #111827 45%, #080d16 100%)",
    fontFamily: "var(--font-ui)",
    color: "#f7f8fb",
    padding: 20,
    boxSizing: "border-box",
  },
  card: {
    width: "100%",
    maxWidth: 410,
    padding: "34px 30px",
    borderRadius: 24,
    background: "rgba(255,255,255,0.075)",
    border: "1px solid rgba(255,255,255,0.13)",
    backdropFilter: "blur(18px)",
    boxShadow: "0 24px 70px rgba(0,0,0,.42)",
    display: "flex",
    flexDirection: "column",
    boxSizing: "border-box",
  },
  logoMark: {
    width: 54,
    height: 54,
    borderRadius: 17,
    display: "grid",
    placeItems: "center",
    alignSelf: "center",
    background: "linear-gradient(135deg,#e8c98a,#a77a3e)",
    color: "#101725",
    fontWeight: 900,
    fontSize: 20,
    letterSpacing: 1,
    boxShadow: "0 8px 28px rgba(207,166,98,.25)",
  },
  eyebrow: {
    textAlign: "center",
    color: "#c9a66b",
    fontSize: 10,
    letterSpacing: 2.2,
    margin: "18px 0 8px",
  },
  h2: {
    textAlign: "center",
    fontSize: "clamp(1.45rem,5vw,1.9rem)",
    letterSpacing: 1.4,
    margin: "0 0 8px",
  },
  subtitle: {
    textAlign: "center",
    color: "#aab5c5",
    fontSize: 13,
    lineHeight: 1.6,
    margin: "0 0 24px",
    textTransform: "none",
  },
  googleBtn: {
    width: "100%",
    minHeight: 50,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    borderRadius: 12,
    border: "1px solid rgba(255,255,255,.2)",
    background: "#fff",
    color: "#202938",
    fontWeight: 700,
    fontSize: 12,
    letterSpacing: .6,
    cursor: "pointer",
  },
  googleG: {
    fontSize: 19,
    fontWeight: 900,
    color: "#4285f4",
    fontFamily: "Arial,sans-serif",
  },
  separator: {
    display: "flex",
    alignItems: "center",
    gap: 12,
    color: "#8491a3",
    fontSize: 9,
    letterSpacing: 1.1,
    margin: "23px 0 18px",
    textAlign: "center",
  },
  label: {
    color: "#c4ccd8",
    fontSize: 10,
    letterSpacing: 1.2,
    fontWeight: 700,
    marginBottom: 8,
  },
  input: {
    width: "100%",
    boxSizing: "border-box",
    padding: "14px 15px",
    marginBottom: 17,
    border: "1px solid rgba(255,255,255,.13)",
    borderRadius: 11,
    background: "rgba(7,13,24,.58)",
    color: "#fff",
    fontSize: 14,
    outline: "none",
    textTransform: "none",
  },
  btn: {
    width: "100%",
    padding: "15px 18px",
    marginTop: 3,
    border: "none",
    borderRadius: 11,
    fontWeight: 800,
    fontSize: 13,
    letterSpacing: 1,
    background: "linear-gradient(135deg,#e5c487,#b8874d)",
    color: "#121a27",
    cursor: "pointer",
  },
  small: {
    textAlign: "center",
    margin: "18px 0 0",
    fontSize: 11,
  },
  footer: {
    textAlign: "center",
    color: "#aab5c5",
    fontSize: 11,
    margin: "16px 0 0",
  },
  link: {
    color: "#e2c187",
    textDecoration: "none",
    fontWeight: 700,
  },
};
