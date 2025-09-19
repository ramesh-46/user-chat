// import React from "react";

// export default function Navbar({ logout, onProfile }) {
//   return (
//     <div style={styles.bar}>
//       <h3 style={{ margin: 0 }}>Ramesh Chat</h3>
//       <div>
//         <button style={styles.link} onClick={onProfile}>My Account</button>
//         <button style={styles.out}  onClick={logout}>Logout</button>
//       </div>
//     </div>
//   );
// }

// const styles = {
//   bar: { height: 56, display: "flex", alignItems: "center", justifyContent: "space-between",
//          padding: "0 24px", background: "#B39DDB", color: "#311B92" },
//   link:{ marginRight: 12, border: "none", background: "transparent", color: "#311B92",
//          fontWeight: 600, cursor: "pointer" },
//   out: { border: "none", background: "#fff", color: "#6A11CB", padding: "6px 12px",
//          borderRadius: 6, cursor: "pointer" }
// };

// client/src/components/Navbar.js


// import React, { useContext } from "react";
// import { ThemeContext } from "../contexts/ThemeContext";

// export default function Navbar({ logout, onProfile }) {
//   const { theme } = useContext(ThemeContext);

//   return (
//     <div style={S.bar}>
//       <h3 style={S.title}>{theme.name} Chat</h3>

//       <div style={S.right}>
//         <button style={S.link} onClick={onProfile}>
//           My Account
//         </button>
//         <button style={S.out} onClick={logout}>
//           Logout
//         </button>
//       </div>
//     </div>
//   );
// }

// /* --------------- theme-aware, responsive styles --------------- */
// const S = {
//   bar: {
//     height: 64,
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     padding: "0 28px",
//     background: "var(--primarySoft)",
//     borderBottom: "1px solid var(--border)",
//     color: "var(--primary)",
//     fontFamily: "var(--font-ui)",
//     boxSizing: "border-box",
//   },

//   title: {
//     margin: 0,
//     fontWeight: 700,
//     fontSize: "clamp(1.3rem, 3vw, 1.6rem)",
//     letterSpacing: 0.5,
//   },

//   right: {
//     display: "flex",
//     alignItems: "center",
//     gap: 14,
//   },

//   link: {
//     border: "none",
//     background: "transparent",
//     color: "var(--primary)",
//     fontWeight: 600,
//     fontSize: "clamp(1rem, 2.4vw, 1.1rem)",
//     cursor: "pointer",
//   },

//   out: {
//     border: "none",
//     background: "var(--primary)",
//     color: "var(--primarySoft)",
//     padding: "8px 16px",
//     borderRadius: 8,
//     fontWeight: 600,
//     fontSize: "clamp(0.95rem, 2.3vw, 1.05rem)",
//     cursor: "pointer",
//   },
// };

// import React from "react";

// export default function Navbar({ logout, onProfile }) {
//   return (
//     <div style={S.bar}>
//       <h3 style={S.title}>BLACK PEARL CHAT</h3>

//       <div style={S.right}>
//        <button style={S.link} onClick={onProfile}>
//   My&nbsp;Account
// </button>

//         {/* <button style={S.out} onClick={logout}>
//           Logout
//         </button> */}
//       </div>
//     </div>
//   );
// }

// const S = {
//   bar: {
//     height: 68,
//     display: "flex",
//     alignItems: "center",
//     justifyContent: "space-between",
//     padding: "0 30px",
//     background: "var(--primary)",          // dark strip
//     borderBottom: "1px solid var(--border)",
//     fontFamily: "var(--font-ui)",
//     color: "var(--textMain)",
//   },

//   title: {
//     margin: 0,
//     fontWeight: 700,
//     fontSize: "clamp(1.3rem, 3vw, 1.6rem)",
//   },

//   right: { display: "flex", gap: 16 },
// link: {
//   border: "none",
//   background: "transparent",
//   color: "var(--textMain)",
//   fontWeight: 600,
//   fontSize: "clamp(1rem, 2.4vw, 1.1rem)",
//   cursor: "pointer",
//   padding: "10px 16px",
//   borderRadius: "8px",
//   backgroundColor: "var(--primarySoft)",
//   boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)", // 🎯 soft shadow
//   transition: "all 0.3s ease",
//   ":hover": {
//   boxShadow: "0 4px 12px rgba(0, 0, 0, 0.2)",
//   transform: "translateY(-1px)",
// }



//   },

//   out: {
//     border: "none",
//     background: "var(--textMain)",         // accent inversion
//     color: "var(--primary)",
//     padding: "8px 18px",
//     borderRadius: 8,
//     fontWeight: 600,
//     fontSize: "clamp(1rem, 2.4vw, 1.1rem)",
//     cursor: "pointer",
//   },
// };
import React from "react";

export default function Navbar({ logout, onProfile }) {
  return (
    <div style={S.bar}>
      <div style={S.left}>
        <img
          src="/logo512.png"
          alt="Logo"
          style={S.logo}
        />
        <h3 style={S.title}>BLACK PEARL CHAT</h3>
      </div>
      <div style={S.right}>
        <button style={S.link} onClick={onProfile}>
          My&nbsp;Account
        </button>
        {/* Uncomment the following button if you want to include the logout functionality */}
        {/* <button style={S.out} onClick={logout}>
          Logout
        </button> */}
      </div>
    </div>
  );
}

const S = {
  bar: {
    height: 68,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "0 30px",
    background: "var(--primary)",
    borderBottom: "1px solid var(--border)",
    fontFamily: "var(--font-ui)",
    color: "var(--textMain)",
  },
  left: {
    display: "flex",
    alignItems: "center",
    gap: 12,
  },
  logo: {
    height: "clamp(28px, 4vw, 36px)",
    width: "clamp(28px, 4vw, 36px)",
    objectFit: "contain",
  },
  title: {
    margin: 0,
    fontWeight: 700,
    fontSize: "clamp(1.3rem, 3vw, 1.6rem)",
  },
  right: {
    display: "flex",
    gap: 16,
  },
  link: {
    border: "none",
    background: "transparent",
    color: "var(--textMain)",
    fontWeight: 600,
    fontSize: "clamp(1rem, 2.4vw, 1.1rem)",
    cursor: "pointer",
    padding: "10px 16px",
    borderRadius: "8px",
    backgroundColor: "var(--primarySoft)",
    boxShadow: "0 2px 8px rgba(0, 0, 0, 0.15)",
    transition: "all 0.3s ease",
  },
  out: {
    border: "none",
    background: "var(--textMain)",
    color: "var(--primary)",
    padding: "8px 18px",
    borderRadius: 8,
    fontWeight: 600,
    fontSize: "clamp(1rem, 2.4vw, 1.1rem)",
    cursor: "pointer",
  },
};
