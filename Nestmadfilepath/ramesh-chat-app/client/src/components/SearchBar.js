// import React, { useState } from "react";
// import { findUser } from "../api";
// import { motion } from "framer-motion";

// export default function SearchBar({ onFound }) {
//   const [query, setQuery] = useState("");

//   const go = async () => {
//     if (!query.trim()) return;
//     const res = await findUser(query.trim());
//     res.data.success ? onFound(res.data.user) : alert("User not found");
//     setQuery("");
//   };

//   return (
//     <motion.div style={styles.box} initial={{ y: -60 }} animate={{ y: 0 }}>
//       <input
//         style={styles.inp}
//         placeholder="Enter mobile number or username"
//         value={query}
//         onChange={e => setQuery(e.target.value)}
//       />
//       <button style={styles.btn} onClick={go}>Chat</button>
//     </motion.div>
//   );
// }

// const styles = {
//   box:{ display:"flex", padding:16, background:"#C5CAE9" },
//   inp:{ flex:1, padding:10, borderRadius:8, border:"none", marginRight:8 },
//   btn:{ padding:"10px 16px", border:"none", borderRadius:8,
//         background:"#6A11CB", color:"#fff", cursor:"pointer" }
// };


// client/src/components/SearchBar.js
import React, { useState } from "react";
import { findUser } from "../api";
import { motion } from "framer-motion";

export default function SearchBar({ onFound }) {
  const [query, setQuery] = useState("");

  const go = async () => {
    if (!query.trim()) return;
    const res = await findUser(query.trim());
    res.data.success ? onFound(res.data.user) : alert("User not found");
    setQuery("");
  };

  return (
    <motion.div style={S.box} initial={{ y: -60 }} animate={{ y: 0 }}>
      <input
        style={S.inp}
        placeholder="Enter mobile number or username"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <button style={S.btn} onClick={go}>
        Chat
      </button>
    </motion.div>
  );
}

/* --------------- theme-aware, responsive styles --------------- */
const S = {
  box: {
    display: "flex",
    padding: 18,
    background: "var(--primarySoft)",
    borderBottom: "1px solid var(--border)",
    fontFamily: "var(--font-ui)",
    gap: 10,
    boxSizing: "border-box",
  },

  inp: {
    flex: 1,
    padding: "14px 16px",
    borderRadius: 10,
    border: "1px solid var(--border)",
    fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
    outline: "none",
    fontFamily: "var(--font-ui)",
    background: "#fff",
    color: "var(--textMain)",
  },

  btn: {
    padding: "14px 20px",
    border: "none",
    borderRadius: 10,
    background: "white",
    color: "var(--primarySoft)",
    fontWeight: 600,
    fontSize: "clamp(1rem, 2.5vw, 1.15rem)",
    fontFamily: "var(--font-ui)",
    cursor: "pointer",
  },
};
