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

/* Premium purple search surface */
const S = {
  box: { display: "flex", alignItems: "center", padding: "14px 18px", background: "#FFFFFF", borderBottom: "1px solid #ECE8F5", fontFamily: "var(--font-ui)", gap: 10, boxSizing: "border-box" },
  inp: { flex: 1, minWidth: 0, padding: "13px 16px", borderRadius: 14, border: "1px solid #E5E0F0", fontSize: 14, outline: "none", fontFamily: "var(--font-ui)", background: "#F8F7FC", color: "#302B45" },
  btn: { padding: "13px 20px", border: "none", borderRadius: 13, background: "linear-gradient(135deg, #8065F5, #6D50E8)", color: "#FFFFFF", fontWeight: 700, fontSize: 14, fontFamily: "var(--font-ui)", cursor: "pointer", boxShadow: "0 6px 16px rgba(128,101,245,.2)" },
};
