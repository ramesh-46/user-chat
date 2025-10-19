import { io } from "socket.io-client";

const SOCKET_URL = "https://blackpearlbackend.onrender.com"; // your backend URL

// Single shared Socket.IO instance
const socket = io(SOCKET_URL, {
  transports: ["websocket"],
  withCredentials: true,
});

socket.on("connect", () => console.log("✅ Socket connected:", socket.id));
socket.on("connect_error", (err) => console.error("❌ Socket connection failed:", err.message));

export default socket;
