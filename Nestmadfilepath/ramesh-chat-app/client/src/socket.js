// import { io } from "socket.io-client";

// const SOCKET_URL = "https://blackpearlbackend.onrender.com"; // your backend URL

// // Single shared Socket.IO instance
// const socket = io(SOCKET_URL, {
//   transports: ["websocket"],
//   withCredentials: true,
// });

// socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
// socket.on("connect_error", (err) => console.error("❌ Socket connection failed:", err.message));

// export default socket;


// src/socket.js
import { io } from "socket.io-client";

// ✅ Clean URL — NO TRAILING SPACES
const SOCKET_URL = "https://blackpearlbackend.onrender.com";

// 🌐 Single, reusable socket instance
const socket = io(SOCKET_URL, {
  transports: ["websocket", "polling"],
  withCredentials: true,
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on("connect", () => {
  console.log("✅ Socket connected. ID:", socket.id);
});

socket.on("connect_error", (err) => {
  console.error("❌ Socket connection failed:", err.message);
});

socket.on("disconnect", () => {
  console.log("🔌 Socket disconnected");
});

export default socket;
