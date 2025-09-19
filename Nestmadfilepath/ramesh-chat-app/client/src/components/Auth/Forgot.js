// // client/src/components/Auth/Forgot.js

// import React, { useState } from "react";
// import { recoverUsername, recoverEmail } from "../../api";

// export default function Forgot() {
//   const [mode, setMode] = useState("uname"); // uname | email
//   const [input, setInput] = useState("");
//   const [result, setResult] = useState("");

//   const go = async () => {
//     try {
//       const res =
//         mode === "uname"
//           ? await recoverUsername(input)
//           : await recoverEmail(input);
//       setResult(JSON.stringify(res.data, null, 2));
//     } catch (e) {
//       setResult(e?.response?.data?.error || "Not found");
//     }
//   };

//   return (
//     <div style={{padding:40}}>
//       <h2>Recover {mode === "uname" ? "Username  →" : "Email →"}</h2>
//       <select value={mode} onChange={e=>setMode(e.target.value)}>
//         <option value="uname">I know e‑mail, need username</option>
//         <option value="email">I know username, need e‑mail</option>
//       </select>
//       <br/>
//       <input style={{padding:8,margin:"12px 0"}} placeholder="Enter value" value={input} onChange={e=>setInput(e.target.value)}/>
//       <button onClick={go}>Recover</button>
//       {result && <pre>{result}</pre>}
//     </div>
//   );
// }

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

// import React, { useState, useContext } from "react";
// import { motion } from "framer-motion";
// import { recoverUsername, recoverEmail } from "../../api";
// import { ThemeContext } from "../../contexts/ThemeContext";

// export default function Forgot() {
//   const [mode, setMode] = useState("uname");   // "uname" | "email"
//   const [input, setInput] = useState("");
//   const [message, setMessage] = useState("");

//   const { theme } = useContext(ThemeContext);  // for heading

//   /* -------- handler -------- */
//   const go = async () => {
//     if (!input.trim()) {
//       setMessage("❗ Please enter a value");
//       return;
//     }

//     try {
//       let response;
//       if (mode === "uname") {
//         response = await recoverUsername(input.trim());
//         setMessage(`✅ Your username is: ${response.username}`);
//       } else {
//         response = await recoverEmail(input.trim());
//         setMessage(`✅ Your email is: ${response.email}`);
//       }
//     } catch (e) {
//       setMessage("❌ Not found. Please check your input.");
//     }
//   };

//   return (
//     <motion.div
//       initial={{ opacity: 0 }}
//       animate={{ opacity: 1 }}
//       style={styles.wrap}
//     >
//       <div style={styles.card}>
//         <h2 style={{ ...styles.h2, fontFamily: "var(--font-ui)" }}>
//           {theme.name} Recovery
//         </h2>

//         <select
//           value={mode}
//           onChange={(e) => {
//             setMode(e.target.value);
//             setInput("");
//             setMessage("");
//           }}
//           style={styles.select}
//         >
//           <option value="uname">I know e‑mail, need username</option>
//           <option value="email">I know username, need e‑mail</option>
//         </select>

//         <input
//           style={styles.input}
//           placeholder={mode === "uname" ? "Enter your email" : "Enter your username"}
//           value={input}
//           onChange={(e) => setInput(e.target.value)}
//         />

//         <button style={styles.btn} onClick={go}>
//           Recover
//         </button>

//         {message && <div style={styles.result}>{message}</div>}
//       </div>
//     </motion.div>
//   );
// }

// const radius = 18;

// const styles = {
//   wrap: {
//     minHeight: "100vh",
//     display: "flex",
//     justifyContent: "center",
//     alignItems: "center",
//     padding: 16,
//     background: "linear-gradient(135deg,var(--primary),var(--primarySoft))",
//     fontFamily: "var(--font-ui)",
//     color: "var(--textMain)"
//   },

//   card: {
//     width: "100%",
//     maxWidth: 420,
//     padding: "44px 34px",
//     borderRadius: radius,
//     background: "rgba(255,255,255,.08)",
//     backdropFilter: "blur(15px)",
//     boxShadow: "0 10px 30px rgba(0,0,0,.25)",
//     display: "flex",
//     flexDirection: "column",
//     alignItems: "center"
//   },

//   h2: {
//     fontSize: "clamp(1.6rem, 5vw, 2.3rem)",
//     marginBottom: 28,
//     letterSpacing: 0.8
//   },

//   select: {
//     width: "100%",
//     padding: "16px 18px",
//     marginBottom: 18,
//     border: "none",
//     borderRadius: radius,
//     fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
//     fontFamily: "var(--font-ui)",
//     background: "var(--primarySoft)",
//     color: "var(--textMain)",
//     outline: "none",
//     cursor: "pointer"
//   },

//   input: {
//     width: "100%",
//     padding: "16px 18px",
//     marginBottom: 18,
//     border: "none",
//     borderRadius: radius,
//     fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
//     fontFamily: "var(--font-ui)",
//     outline: "none"
//   },

//   btn: {
//     width: "100%",
//     padding: "16px 18px",
//     marginTop: 4,
//     border: "none",
//     borderRadius: radius,
//     fontWeight: 600,
//     fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
//     background: "lightgreen",
//     color: "var(--primarySoft)",
//     fontFamily: "var(--font-ui)",
//     cursor: "pointer"
//   },

//   result: {
//     marginTop: 18,
//     padding: "12px 16px",
//     background: "rgba(0, 0, 0, 0.4)",
//     color: "#fff",
//     borderRadius: radius,
//     fontSize: "clamp(0.95rem, 2.3vw, 1.05rem)",
//     textAlign: "center",
//     wordBreak: "break-word"
//   }
// };









import React, { useState, useContext } from "react";
import { motion } from "framer-motion";
import { recoverUsername, recoverEmail, recoverByQuestion } from "../../api";
import { ThemeContext } from "../../contexts/ThemeContext";

export default function Forgot() {
  const [mode, setMode] = useState("uname"); // "uname" | "email" | "recovery"
  const [input, setInput] = useState("");
  const [answer, setAnswer] = useState("");
  const [step, setStep] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const { theme } = useContext(ThemeContext);

  const go = async () => {
    if (!input.trim()) return alert("Enter a value first");
    try {
      setError("");
      if (mode === "recovery") {
        if (step === 1) {
          setStep(2);
        } else {
          const res = await recoverByQuestion(input.trim(), answer.trim());
          setResult(res.data);
        }
      } else {
        const res =
          mode === "uname"
            ? await recoverUsername(input)
            : await recoverEmail(input);
        setResult(res.data);
      }
    } catch (e) {
      setResult(null);
      setError(e?.response?.data?.error || "Not found");
    }
  };

  const renderResult = () => {
    if (error) {
      return (
        <div style={styles.errorBox}>
          <strong>Error:</strong> {error}
        </div>
      );
    }

    if (!result) return null;

    const key = Object.keys(result)[0];
    let value = result[key];

    if (key === "password") {
      value = `🔐 ${value}`;
    }

    return (
      <div style={styles.resultBox}>
        <span style={styles.resultLabel}>
          Recovered {key.charAt(0).toUpperCase() + key.slice(1)}:
        </span>
        <div style={styles.resultValue}>{value}</div>
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={styles.wrap}
    >
      <div style={styles.card}>
        <h2 style={{ ...styles.h2, fontFamily: "var(--font-ui)" }}>
          {theme.name} Recovery
        </h2>

        <select
          value={mode}
          onChange={(e) => {
            setMode(e.target.value);
            setInput("");
            setResult(null);
            setStep(1);
            setError("");
          }}
          style={styles.select}
        >
          <option value="uname">I know e-mail, need username</option>
          <option value="email">I know username, need e-mail</option>
          <option value="recovery">Recover Password (Security Q)</option>
        </select>

        <input
          style={styles.input}
          placeholder={mode === "email" ? "Enter username" : "Enter email"}
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />

        {mode === "recovery" && step === 2 && (
          <input
            style={styles.input}
            placeholder="Who was your favorite teacher?"
            value={answer}
            onChange={(e) => setAnswer(e.target.value)}
          />
        )}

        <button style={styles.btn} onClick={go}>
          {mode === "recovery" && step === 2 ? "Submit Answer" : "Recover"}
        </button>

        {renderResult()}
      </div>
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
    padding: 16,
    background: "linear-gradient(135deg,var(--primary),var(--primarySoft))",
    fontFamily: "var(--font-ui)",
    color: "var(--textMain)"
  },
  card: {
    width: "100%",
    maxWidth: 420,
    padding: "44px 34px",
    borderRadius: radius,
    background: "rgba(255,255,255,.08)",
    backdropFilter: "blur(15px)",
    boxShadow: "0 10px 30px rgba(0,0,0,.25)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center"
  },
  h2: {
    fontSize: "clamp(1.6rem, 5vw, 2.3rem)",
    marginBottom: 28,
    letterSpacing: 0.8
  },
  select: {
    width: "100%",
    padding: "16px 18px",
    marginBottom: 18,
    border: "none",
    borderRadius: radius,
    fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
    fontFamily: "var(--font-ui)",
    background: "var(--primarySoft)",
    color: "var(--textMain)",
    outline: "none",
    cursor: "pointer"
  },
  input: {
    width: "100%",
    padding: "16px 18px",
    marginBottom: 18,
    border: "none",
    borderRadius: radius,
    fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
    fontFamily: "var(--font-ui)",
    outline: "none"
  },
  btn: {
    width: "100%",
    padding: "16px 18px",
    marginTop: 4,
    border: "none",
    borderRadius: radius,
    fontWeight: 600,
    fontSize: "clamp(1rem, 2.5vw, 1.1rem)",
    background: "lightgreen",
    color: "var(--primarySoft)",
    fontFamily: "var(--font-ui)",
    cursor: "pointer"
  },
  resultBox: {
    marginTop: 24,
    width: "100%",
    background: "rgba(255,255,255,0.07)",
    padding: "16px 18px",
    borderRadius: radius,
    color: "#fff",
    borderLeft: "5px solid limegreen"
  },
  resultLabel: {
    fontSize: "0.95rem",
    fontWeight: "bold",
    display: "block",
    marginBottom: 6
  },
  resultValue: {
    fontSize: "1.05rem",
    fontWeight: 600,
    wordBreak: "break-word",
    color: "lightgreen"
  },
  errorBox: {
    marginTop: 24,
    width: "100%",
    background: "rgba(255,0,0,0.08)",
    padding: "16px 18px",
    borderRadius: radius,
    color: "#ff4d4f",
    fontWeight: 500,
    borderLeft: "5px solid #ff4d4f"
  }
};
