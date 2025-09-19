// import React, { useState, useContext } from "react";
// import { login as apiLogin } from "../../api";
// import { AuthContext } from "../../contexts/AuthContext";
// import { Link, useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";

// export default function Login() {
//   const [mobile, setMobile]     = useState("");
//   const [password, setPassword] = useState("");
//   const { login } = useContext(AuthContext);
//   const nav = useNavigate();

//   const handle = async () => {
//     try {
//       const res = await apiLogin({ mobile, password });
//       login(res.data);
//       nav("/");
//     } catch (e) {
//       alert(e.response?.data?.error || "Error");
//     }
//   };

//   return (
//     <motion.div style={styles.box} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
//       <h2 style={{ marginBottom: 24 }}>Ramesh Chat</h2>
//       <input style={styles.inp} placeholder="Mobile" value={mobile} onChange={e => setMobile(e.target.value)} />
//       <input style={styles.inp} type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
//       <button style={styles.btn} onClick={handle}>Login</button>
//       <p style={styles.small}>No account? <Link to="/signup">Sign up</Link></p>
//     </motion.div>
//   );
// }

// const primary = "#6A11CB";
// const styles = {
//   box:   { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100vh", background: "linear-gradient(135deg, #6a11cb 0%, #2575fc 100%)", color: "#fff" },
//   inp:   { width: 280, padding: 12, marginBottom: 12, borderRadius: 6, border: "none" },
//   btn:   { width: 280, padding: 12, border: "none", background: "#fff", color: primary, borderRadius: 6, fontWeight: "bold", cursor: "pointer" },
//   small: { marginTop: 12 }
// // };
// import React, { useState, useContext } from "react";
// import { Link, useNavigate } from "react-router-dom";
// import { motion } from "framer-motion";
// import { signInWithEmailAndPassword } from "firebase/auth";

// import { auth }               from "../../firebase";
// import { login as apiLogin, recoverEmail } from "../../api";
// import { AuthContext }         from "../../contexts/AuthContext";

// export default function Login() {
//   const [username, setUsername] = useState("");
//   const [password, setPassword] = useState("");
//   const { login }  = useContext(AuthContext);
//   const nav        = useNavigate();

//   const handleLogin = async () => {
//     if (!username || !password) return alert("Fill both fields");

//     try {
//       /* 1 · find email for username */
//       const emailRes = await recoverEmail(username);
//       const email = emailRes.data.email;

//       /* 2 · Firebase sign‑in */
//       await signInWithEmailAndPassword(auth, email, password);

//       /* 3 · backend login (stores/creates user) */
//       const res = await apiLogin({ username: username.toLowerCase(), password });
//       login(res.data);
//       nav("/");
//     } catch (err) {
//       alert(err?.response?.data?.error || err.message);
//     }
//   };

//   return (
//     <motion.div style={styles.wrap} initial={{opacity:0}} animate={{opacity:1}}>
//       <div style={styles.card}>
//         <h2>Ramesh Chat</h2>

//         <input
//           style={styles.input}
//           placeholder="Username"
//           value={username}
//           onChange={e=>setUsername(e.target.value)}
//         />
//         <input
//           style={styles.input}
//           type="password"
//           placeholder="Password"
//           value={password}
//           onChange={e=>setPassword(e.target.value)}
//         />
//         <button style={styles.btn} onClick={handleLogin}>Log in</button>

//         <p style={styles.small}>
//           Forgot? <Link style={styles.link} to="/forgot">Recover</Link>
//         </p>
//         <p style={styles.small}>
//           No account? <Link style={styles.link} to="/signup">Sign up</Link>
//         </p>
//       </div>
//     </motion.div>
//   );
// }

// /* styles unchanged… */


// /* same glass‑card styles as before */
// const primary="#6A11CB", secondary="#2575FC", radius=16;
// const styles={
//   wrap:{height:"100vh",display:"flex",justifyContent:"center",alignItems:"center",
//     background:`linear-gradient(135deg,${primary},${secondary})`,fontFamily:"Inter,sans-serif",color:"#fff"},
//   card:{width:320,padding:"32px 28px",borderRadius:radius,background:"rgba(255,255,255,.08)",
//     backdropFilter:"blur(15px)",boxShadow:"0 8px 28px rgba(0,0,0,.25)",display:"flex",
//     flexDirection:"column",alignItems:"center"},
//   input:{width:"100%",padding:"14px 16px",marginBottom:14,border:"none",borderRadius:radius,fontSize:"1rem",outline:"none"},
//   btn:{width:"100%",padding:"14px 16px",border:"none",borderRadius:radius,fontWeight:600,fontSize:"1rem",
//     background:"#fff",color:primary,cursor:"pointer"},
//   small:{marginTop:12,fontSize:".9rem"},
//   link:{color:"#fff",textDecoration:"underline"}
// };


import React, { useState, useContext } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { signInWithEmailAndPassword } from "firebase/auth";

import { auth } from "../../firebase";
import { login as apiLogin, recoverEmail } from "../../api";
import { AuthContext } from "../../contexts/AuthContext";
import { ThemeContext } from "../../contexts/ThemeContext"; // ⭐ read theme name (optional)

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { login } = useContext(AuthContext);
  const { theme } = useContext(ThemeContext);            // just for the title
  const nav = useNavigate();

  /* ---------------- handlers ---------------- */
  const handleLogin = async () => {
    if (!username || !password) return alert("Fill both fields");
    try {
      /* 1 - map username ➜ email */
      const email = (await recoverEmail(username)).data.email;

      /* 2 - Firebase sign-in */
      await signInWithEmailAndPassword(auth, email, password);

      /* 3 - backend session login */
      const res = await apiLogin({
        username: username.toLowerCase(),
        password
      });
      login(res.data);
      nav("/");
    } catch (err) {
      alert(err?.response?.data?.error || err.message);
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
          {theme.name} Chat
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

        <button style={styles.btn} onClick={handleLogin}>
          Log in
        </button>

        <p style={styles.small}>
          Forgot?{" "}
          <Link style={styles.link} to="/forgot">
            Recover
          </Link>
        </p>
        <p style={styles.small}>
          No account?{" "}
          <Link style={styles.link} to="/signup">
            Sign up
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
    /* gradient pulled from CSS variables */
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
    alignItems: "center"
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
    fontFamily: "var(--font-ui)"
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
    fontFamily: "var(--font-ui)"
  },

  small: {
    marginTop: 14,
    fontSize: "clamp(0.85rem, 2vw, 0.95rem)"
  },

  link: {
    color: "var(--textMain)",
    textDecoration: "underline"
  }
};
