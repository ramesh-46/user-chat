// require("dotenv").config();
// const express    = require("express");
// const http       = require("http");
// const cors       = require("cors");
// const mongoose   = require("mongoose");
// const { Server } = require("socket.io");
// const path       = require("path");

// /* ─── Firebase Admin (singleton) ─────────────────── */
// const admin = require("firebase-admin");
// if (!admin.apps.length) {
//   const serviceAccount = require("./serviceAccount.json"); // path via FB_ADMIN_CRED optional
//   admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
// }

// /* ─── Route Imports ──────────────────────────────── */
// const authRoutes     = require("./routes/authRoutes");
// const chatRoutes     = require("./routes/chatRoutes");
// const profileRoutes  = require("./routes/profileRoutes");
// const settingsRoutes = require("./routes/settingsRoutes");
// const User           = require("./models/User");


// /* ─── Express & Socket.IO Setup ──────────────────── */
// const app    = express();
// const server = http.createServer(app);
// const io     = new Server(server, { cors: { origin: "*", methods: ["GET", "POST"] } });

// /* ─── Mongo Connection ───────────────────────────── */
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("✅  MongoDB connected"))
//   .catch(err => console.error("❌  DB Error", err.message));

// /* ─── Middleware ─────────────────────────────────── */
// app.use(cors());
// app.use(express.json());
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// /* ─── API Routes ─────────────────────────────────── */
// app.use("/api/auth",    authRoutes);
// app.use("/api/profile", profileRoutes);
// app.use("/api",         chatRoutes);
// app.use("/api/settings", settingsRoutes);

// /* ─── Socket.IO Events ───────────────────────────── */
// io.on("connection", socket => {
//   console.log("⚡ Socket", socket.id, "connected");

//   /* user joins its own room & marked online */
//   socket.on("join", async userId => {
//     socket.join(userId);
//     await User.findByIdAndUpdate(userId, { online: true });
//     socket.broadcast.emit("userOnline", userId);
//   });

//   /* typing indicator for chat */
//   socket.on("typing", ({ from, to }) => io.to(to).emit("peerTyping", from));

//   /* chat messages */
//   socket.on("sendMessage", data => {
//     io.to(data.receiver).emit("receiveMessage", data);
//     io.to(data.receiver).emit("refreshConversations");
//     io.to(data.sender).emit("refreshConversations");
//   });

//   /* ── WebRTC signaling (voice / video calls) ── */
//   socket.on("webrtc-offer",  data => io.to(data.to).emit("webrtc-offer",  { from: socket.id, ...data }));
//   socket.on("webrtc-answer", data => io.to(data.to).emit("webrtc-answer", { from: socket.id, ...data }));
//   socket.on("webrtc-ice",    data => io.to(data.to).emit("webrtc-ice",    { from: socket.id, ...data }));

//   /* disconnect => mark offline */
//   socket.on("disconnect", async () => {
//     console.log("🔌 Socket", socket.id, "disconnected");
//     const rooms = [...socket.rooms].filter(r => r !== socket.id);
//     for (const id of rooms) {
//       await User.findByIdAndUpdate(id, { online: false, lastSeen: new Date() });
//       socket.broadcast.emit("userOffline", id);
//     }
//   });
// });

// /* ─── Start Server ──────────────────────────────── */
// const PORT = process.env.PORT || 4000;
// server.listen(PORT, () => console.log(`🚀  Server @ http://localhost:${PORT}`));








// require("dotenv").config();
// const express = require("express");
// const http = require("http");
// const cors = require("cors");
// const mongoose = require("mongoose");
// const { Server } = require("socket.io");
// const path = require("path");

// // Firebase Admin SDK
// const admin = require("firebase-admin");
// if (!admin.apps.length) {
//   const serviceAccount = require("./serviceAccount.json");
//   admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
// }

// // Models and Routes
// const User = require("./models/User");
// const authRoutes = require("./routes/authRoutes");
// const chatRoutes = require("./routes/chatRoutes");
// const profileRoutes = require("./routes/profileRoutes");
// const settingsRoutes = require("./routes/settingsRoutes");

// // App & Server Setup
// const app = express();
// const server = http.createServer(app);
// const io = new Server(server, {
//   cors: { origin: "*", methods: ["GET", "POST"] }
// });

// // MongoDB Connection
// mongoose.connect(process.env.MONGO_URI)
//   .then(() => console.log("✅ MongoDB connected"))
//   .catch(err => console.error("❌ DB Error", err.message));

// // Middleware
// app.use(cors());
// app.use(express.json());
// app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// // API Routes
// app.use("/api/auth", authRoutes);
// app.use("/api/profile", profileRoutes);
// app.use("/api", chatRoutes);
// app.use("/api/settings", settingsRoutes);

// // Socket.IO Logic
// io.on("connection", (socket) => {
//   console.log("⚡ Socket", socket.id, "connected");

//   socket.on("join", async (userId) => {
//     if (!userId) return; // ✅ prevent null/undefined joins
//     console.log(`User ${userId} joined their room.`);
//     socket.join(userId);
//     try {
//       await User.findByIdAndUpdate(userId, { online: true, lastSeen: null });
//       io.emit("userOnline", userId);
//     } catch (err) {
//       console.error("Error updating user on join:", err.message);
//     }
//   });

//   socket.on("sendMessage", (data) => {
//     console.log(`Message sent from ${data.sender} to ${data.receiver}:`, data);
//     io.to(data.receiver).emit("receiveMessage", data);
//     io.to(data.sender).emit("receiveMessage", data);
//   });

//   socket.on("typing", ({ from, to }) => {
//     console.log(`Typing from ${from} to ${to}`);
//     io.to(to).emit("peerTyping", from);
//   });

//   socket.on("webrtc-offer", (data) => {
//     console.log(`WebRTC offer from ${data.from} to ${data.to}`);
//     io.to(data.to).emit("webrtc-offer", { from: socket.id, ...data });
//   });

//   socket.on("webrtc-answer", (data) => {
//     console.log(`WebRTC answer from ${data.from} to ${data.to}`);
//     io.to(data.to).emit("webrtc-answer", { from: socket.id, ...data });
//   });

//   socket.on("webrtc-ice", (data) => {
//     console.log(`WebRTC ICE from ${data.from} to ${data.to}`);
//     io.to(data.to).emit("webrtc-ice", { from: socket.id, ...data });
//   });

//   socket.on("disconnect", async () => {
//     console.log("🔌 Socket", socket.id, "disconnected");
//     const rooms = [...socket.rooms].filter(r => r !== socket.id);
//     for (const id of rooms) {
//       try {
//         await User.findByIdAndUpdate(id, {
//           online: false,
//           lastSeen: new Date(),
//         });
//         io.emit("userOffline", id);
//       } catch (err) {
//         console.error("Error updating user on disconnect:", err.message);
//       }
//     }
//   });
// });

// // Server Start
// const PORT = process.env.PORT || 4000;
// server.listen(PORT, () => console.log(`🚀 Server @ http://localhost:${PORT}`));


require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const path = require("path");

// Firebase Admin SDK
const admin = require("firebase-admin");
if (!admin.apps.length) {
  // const serviceAccount = require("./serviceAccount.json"); 
const serviceAccount = {
  type: process.env.FB_TYPE,
  project_id: process.env.FB_PROJECT_ID,
  private_key_id: process.env.FB_PRIVATE_KEY_ID,
  private_key: process.env.FB_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.FB_CLIENT_EMAIL,
  client_id: process.env.FB_CLIENT_ID,
  auth_uri: process.env.FB_AUTH_URI,
  token_uri: process.env.FB_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL,
  universe_domain: process.env.FB_UNIVERSE_DOMAIN,
};


  admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
}

// Models and Routes
const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const profileRoutes = require("./routes/profileRoutes");
const settingsRoutes = require("./routes/settingsRoutes");

// App & Server Setup
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

// MongoDB Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ DB Error", err.message));

// Middleware
app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API Routes
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api", chatRoutes);
app.use("/api/settings", settingsRoutes);

// Socket.IO Logic
io.on("connection", (socket) => {
  console.log("⚡ Socket", socket.id, "connected");

  socket.on("join", async (userId) => {
    if (!userId) return; // ✅ prevent null/undefined joins
    console.log(`User ${userId} joined their room.`);
    socket.join(userId);
    try {
      await User.findByIdAndUpdate(userId, { online: true, lastSeen: null });
      io.emit("userOnline", userId);
    } catch (err) {
      console.error("Error updating user on join:", err.message);
    }
  });

  socket.on("sendMessage", (data) => {
    console.log(`Message sent from ${data.sender} to ${data.receiver}:`, data);
    io.to(data.receiver).emit("receiveMessage", data);
    io.to(data.sender).emit("receiveMessage", data);
  });

  socket.on("typing", ({ from, to }) => {
    console.log(`Typing from ${from} to ${to}`);
    io.to(to).emit("peerTyping", from);
  });

  socket.on("webrtc-offer", (data) => {
    console.log(`WebRTC offer from ${data.from} to ${data.to}`);
    io.to(data.to).emit("webrtc-offer", { from: socket.id, ...data });
  });

  socket.on("webrtc-answer", (data) => {
    console.log(`WebRTC answer from ${data.from} to ${data.to}`);
    io.to(data.to).emit("webrtc-answer", { from: socket.id, ...data });
  });

  socket.on("webrtc-ice", (data) => {
    console.log(`WebRTC ICE from ${data.from} to ${data.to}`);
    io.to(data.to).emit("webrtc-ice", { from: socket.id, ...data });
  });

  socket.on("disconnect", async () => {
    console.log("🔌 Socket", socket.id, "disconnected");
    const rooms = [...socket.rooms].filter(r => r !== socket.id);
    for (const id of rooms) {
      try {
        await User.findByIdAndUpdate(id, {
          online: false,
          lastSeen: new Date(),
        });
        io.emit("userOffline", id);
      } catch (err) {
        console.error("Error updating user on disconnect:", err.message);
      }
    }
  });
});

// Server Start
const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`🚀 Server @ http://localhost:${PORT}`));
