import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "../../firebase";
import { login as apiLogin, recoverEmail } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import { ThemeContext } from "../../contexts/ThemeContext";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false); // loader
  const { login } = useContext(AuthContext);
  const nav = useNavigate();

  /* ---------------- handlers ---------------- */
  const handleLogin = async () => {
    if (!username || !password) return alert("Fill both fields");
    try {
      setLoading(true); // start loader

      const email = (await recoverEmail(username)).data.email;
      await signInWithEmailAndPassword(auth, email, password);

      const res = await apiLogin({
        username: username.toLowerCase(),
        password
      });
      login(res.data);
      nav("/");
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
    } finally {
      setLoading(false); // stop loader
    }
  };

  /* ---------------- ui ---------------- */
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.wrap}
    >
      <div style={styles.card}>
        <h2 style={{ ...styles.h2, fontFamily: "var(--font-ui)" }}>
          BLACK PEARL CHAT
        </h2>

        <input
          style={styles.input}
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />
        <input
          style={styles.input}
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button style={styles.btn} onClick={handleLogin} disabled={loading}>
          {loading ? <span style={styles.spinner}></span> : "LOG IN"}
        </button>

        <p style={styles.small}>
          FORGOT?{" "}
          <Link style={styles.link} to="/forgot">
            RECOVER
          </Link>
        </p>
        <p style={styles.small}>
          NO ACCOUNT?{" "}
          <Link style={styles.link} to="/signup">
            SIGN UP
          </Link>
        </p>
      </div>
    </motion.div>
  );
}

/* ---------------------------------------- */
/* 🎨 “glass card” + responsive typography  */
/* ---------------------------------------- */
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
    padding: 16
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
    textTransform: "uppercase", // all text in card capitalized
    /* responsive adjustment for mobile */
    "@media (max-width: 480px)": {
      maxWidth: 360 * 1.1 // increase 10% on small screens
    }
  },

  h2: {
    fontSize: "clamp(1.5rem, 5vw, 2.2rem)",
    marginBottom: 28,
    letterSpacing: 1
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
    textTransform: "none" // inputs stay normal
  },

  btn: {
    width: "100%",
    padding: "16px 18px",
    marginTop: 4,
    border: "none",
    borderRadius: radius,
    fontWeight: 600,
    fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
    background: "",
    color: "var(--primarySoft)",
    cursor: "pointer",
    fontFamily: "var(--font-ui)",
    position: "relative",
    overflow: "hidden"
  },

  spinner: {
    width: 20,
    height: 20,
    border: "3px solid rgba(255,255,255,0.3)",
    borderTop: "3px solid var(--primarySoft)",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
    display: "inline-block"
  },

  small: {
    marginTop: 14,
    fontSize: "clamp(0.85rem, 2vw, 0.95rem)"
  },

  link: {
    color: "var(--textMain)",
    textDecoration: "underline"
  },

  /* keyframes for spinner animation */
  "@keyframes spin": {
    "0%": { transform: "rotate(0deg)" },
    "100%": { transform: "rotate(360deg)" }
  }
};
