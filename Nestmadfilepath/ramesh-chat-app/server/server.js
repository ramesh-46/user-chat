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
//   socket.on("join", async userId => {//     socket.join(userId);
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
//       console.error("Error updating user on join:", err.message);//     }
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
console.log("🔐 [DEBUG] Initializing Firebase Admin SDK...");

if (!admin.apps.length) {
  console.log("🔐 [DEBUG] No Firebase apps initialized, creating new instance...");
  
  // const serviceAccount = require("./serviceAccount.json"); 
  const serviceAccount = {
    type: process.env.FB_TYPE,
    project_id: process.env.FB_PROJECT_ID,
    private_key_id: process.env.FB_PRIVATE_KEY_ID,
    private_key: process.env.FB_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    client_email: process.env.FB_CLIENT_EMAIL,
    client_id: process.env.FB_CLIENT_ID,
    auth_uri: process.env.FB_AUTH_URI,
    token_uri: process.env.FB_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.FB_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.FB_CLIENT_X509_CERT_URL,
    universe_domain: process.env.FB_UNIVERSE_DOMAIN,
  };

  console.log("🔐 [DEBUG] Firebase config loaded (project_id):", process.env.FB_PROJECT_ID);
  
  try {
    admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    console.log("✅ [DEBUG] Firebase Admin SDK initialized successfully");
  } catch (fbErr) {
    console.error("❌ [DEBUG] Firebase Admin initialization failed:", fbErr.message);
  }
} else {
  console.log("✅ [DEBUG] Firebase Admin SDK already initialized");
}

// Models and Routes
console.log("📦 [DEBUG] Loading models and routes...");
const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const profileRoutes = require("./routes/profileRoutes");
const settingsRoutes = require("./routes/settingsRoutes");console.log("✅ [DEBUG] Models and routes loaded successfully");

// App & Server Setup
console.log("🚀 [DEBUG] Setting up Express app and HTTP server...");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
console.log("✅ [DEBUG] Express app and Socket.IO server created");

// MongoDB Connection
console.log("🗄️ [DEBUG] Connecting to MongoDB...");
console.log("🗄️ [DEBUG] MONGO_URI present:", !!process.env.MONGO_URI);

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log("✅ [DEBUG] MongoDB connected successfully");
    console.log("🗄️ [DEBUG] Connection state:", mongoose.connection.readyState);
  })
  .catch(err => {
    console.error("❌ [DEBUG] MongoDB connection error:", err.message);
    console.error("❌ [DEBUG] Error details:", {
      name: err.name,
      code: err.code,
      reason: err.reason
    });
  });

// Middleware
console.log("🔧 [DEBUG] Setting up middleware...");
app.use(cors());
console.log("✅ [DEBUG] CORS middleware enabled");

app.use(express.json());
console.log("✅ [DEBUG] JSON parser middleware enabled");

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
console.log("✅ [DEBUG] Static uploads middleware enabled at /uploads");

// API Routes
console.log("🛣️ [DEBUG] Registering API routes...");
app.use("/api/auth", authRoutes);
console.log("✅ [DEBUG] Route mounted: /api/auth");

app.use("/api/profile", profileRoutes);
console.log("✅ [DEBUG] Route mounted: /api/profile");

app.use("/api", chatRoutes);
console.log("✅ [DEBUG] Route mounted: /api (chatRoutes)");
app.use("/api/settings", settingsRoutes);
console.log("✅ [DEBUG] Route mounted: /api/settings");

// Request logging middleware (for all API routes)
app.use((req, res, next) => {
  console.log(`📥 [DEBUG] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  if (req.method !== 'GET') {
    console.log("📥 [DEBUG] Request body:", JSON.stringify(req.body).substring(0, 500));
  }
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 [DEBUG] Response ${res.statusCode} for ${req.method} ${req.originalUrl}`);
    originalSend.call(this, data);
  };
  next();
});

// Socket.IO Logic
console.log("⚡ [DEBUG] Setting up Socket.IO event handlers...");

io.on("connection", (socket) => {
  console.log("⚡ [DEBUG] New socket connection:", {
    socketId: socket.id,
    timestamp: new Date().toISOString(),
    handshake: {
      address: socket.handshake.address,
      headers: socket.handshake.headers['user-agent']?.substring(0, 100)
    }
  });

  socket.on("join", async (userId) => {
    console.log("👤 [DEBUG] Socket 'join' event received:", { socketId: socket.id, userId });
    
    if (!userId) {
      console.warn("⚠️ [DEBUG] Join event rejected: userId is null/undefined");
      return;
    }
    
    console.log(`👤 [DEBUG] User ${userId} joining room: ${userId}`);
    socket.join(userId);
    
    try {
      console.log(`👤 [DEBUG] Updating user ${userId} status to online...`);
      await User.findByIdAndUpdate(userId, { online: true, lastSeen: null });
      console.log(`✅ [DEBUG] User ${userId} marked as online`);
      
      io.emit("userOnline", userId);
      console.log(`📢 [DEBUG] Broadcasted 'userOnline' event for userId: ${userId}`);
    } catch (err) {      console.error(`❌ [DEBUG] Error updating user ${userId} on join:`, err.message);
      console.error("❌ [DEBUG] Error stack:", err.stack);
    }
  });

  socket.on("sendMessage", (data) => {
    console.log("💬 [DEBUG] Socket 'sendMessage' event received:", {
      socketId: socket.id,
      sender: data?.sender,
      receiver: data?.receiver,
      textPreview: data?.text?.substring(0, 100),
      hasFile: !!data?.file,
      timestamp: new Date().toISOString()
    });
    
    if (data?.receiver) {
      console.log(`💬 [DEBUG] Emitting 'receiveMessage' to receiver room: ${data.receiver}`);
      io.to(data.receiver).emit("receiveMessage", data);
    }
    if (data?.sender) {
      console.log(`💬 [DEBUG] Emitting 'receiveMessage' to sender room: ${data.sender}`);
      io.to(data.sender).emit("receiveMessage", data);
    }
    console.log("✅ [DEBUG] Message broadcast completed");
  });

  socket.on("typing", ({ from, to }) => {
    console.log("⌨️ [DEBUG] Socket 'typing' event:", { from, to, socketId: socket.id });
    if (to) {
      io.to(to).emit("peerTyping", from);
      console.log(`✅ [DEBUG] 'peerTyping' emitted to user: ${to}`);
    }
  });

  socket.on("webrtc-offer", (data) => {
    console.log("📞 [DEBUG] WebRTC 'webrtc-offer' event:", {
      from: data?.from,
      to: data?.to,
      socketId: socket.id,
      hasSdp: !!data?.sdp
    });
    if (data?.to) {
      io.to(data.to).emit("webrtc-offer", { from: socket.id, ...data });
      console.log(`✅ [DEBUG] WebRTC offer forwarded to: ${data.to}`);
    }
  });

  socket.on("webrtc-answer", (data) => {
    console.log("📞 [DEBUG] WebRTC 'webrtc-answer' event:", {
      from: data?.from,      to: data?.to,
      socketId: socket.id,
      hasSdp: !!data?.sdp
    });
    if (data?.to) {
      io.to(data.to).emit("webrtc-answer", { from: socket.id, ...data });
      console.log(`✅ [DEBUG] WebRTC answer forwarded to: ${data.to}`);
    }
  });

  socket.on("webrtc-ice", (data) => {
    console.log("🧊 [DEBUG] WebRTC 'webrtc-ice' event:", {
      from: data?.from,
      to: data?.to,
      socketId: socket.id,
      candidate: data?.candidate ? "present" : "null"
    });
    if (data?.to) {
      io.to(data.to).emit("webrtc-ice", { from: socket.id, ...data });
      console.log(`✅ [DEBUG] WebRTC ICE candidate forwarded to: ${data.to}`);
    }
  });

  socket.on("disconnect", async () => {
    console.log("🔌 [DEBUG] Socket disconnect event:", {
      socketId: socket.id,
      rooms: [...socket.rooms],
      timestamp: new Date().toISOString()
    });
    
    const rooms = [...socket.rooms].filter(r => r !== socket.id);
    console.log(`🔌 [DEBUG] User rooms to process for offline status:`, rooms);
    
    for (const id of rooms) {
      try {
        console.log(`🔌 [DEBUG] Updating user ${id} to offline...`);
        await User.findByIdAndUpdate(id, {
          online: false,
          lastSeen: new Date(),
        });
        console.log(`✅ [DEBUG] User ${id} marked as offline`);
        
        io.emit("userOffline", id);
        console.log(`📢 [DEBUG] Broadcasted 'userOffline' event for userId: ${id}`);
      } catch (err) {
        console.error(`❌ [DEBUG] Error updating user ${id} on disconnect:`, err.message);
        console.error("❌ [DEBUG] Error stack:", err.stack);
      }
    }
  });
  // Catch-all for unknown events
  socket.onAny((event, ...args) => {
    console.log(`❓ [DEBUG] Unhandled socket event: ${event}`, args);
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error("❌ [DEBUG] Express error handler caught:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// 404 handler for undefined routes
app.use((req, res) => {
  console.warn(`⚠️ [DEBUG] 404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: "Route not found" });
});

// Server Start
const PORT = process.env.PORT || 4000;
console.log(`🚀 [DEBUG] Starting server on port ${PORT}...`);
console.log(`🚀 [DEBUG] Environment: ${process.env.NODE_ENV || 'development'}`);

server.listen(PORT, () => {
  console.log(`✅ [DEBUG] Server listening @ http://localhost:${PORT}`);
  console.log(`✅ [DEBUG] API Routes available:`);
  console.log(`   - POST /api/auth/*`);
  console.log(`   - GET/PUT /api/profile/*`);
  console.log(`   - GET/POST /api/messages, /api/conversations/*, /api/chatlist/*`);
  console.log(`   - GET/POST /api/settings/*`);
  console.log(`✅ [DEBUG] Socket.IO ready for connections`);
});

// Graceful shutdown handling
process.on('SIGINT', async () => {
  console.log("🛑 [DEBUG] SIGINT received - starting graceful shutdown...");
  try {
    await mongoose.connection.close();
    console.log("✅ [DEBUG] MongoDB connection closed");
  } catch (err) {
    console.error("❌ [DEBUG] Error closing MongoDB:", err.message);
  }
  server.close(() => {
    console.log("✅ [DEBUG] HTTP server closed");    process.exit(0);
  });
});

process.on('unhandledRejection', (reason, promise) => {
  console.error("❌ [DEBUG] Unhandled Promise Rejection:", {
    reason: reason?.message || reason,
    stack: reason?.stack
  });
});

process.on('uncaughtException', (err) => {
  console.error("❌ [DEBUG] Uncaught Exception:", {
    message: err.message,
    stack: err.stack
  });
  process.exit(1);
});

module.exports = { app, server, io };