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
//       io.emit("userOnline", normalizedUserId);
//     } catch (err) {
//       console.error("Error updating user on join:", err.message);//     }
//   });

// Legacy duplicate socket block removed.

require("dotenv").config();
const express = require("express");
const http = require("http");
const cors = require("cors");
const mongoose = require("mongoose");
const { Server } = require("socket.io");
const path = require("path");

// Firebase Admin SDK: use one shared initializer for routes and middleware.
const admin = require("./config/firebaseAdmin");
const { sendPushToUser } = require("./services/pushNotifications");
console.log("✅ Firebase Admin SDK ready");

// Models and Routes
console.log("📦 [DEBUG] Loading models and routes...");
const User = require("./models/User");
const authRoutes = require("./routes/authRoutes");
const chatRoutes = require("./routes/chatRoutes");
const profileRoutes = require("./routes/profileRoutes");
const settingsRoutes = require("./routes/settingsRoutes");
const groupRoutes = require("./routes/grouproutes");
const groupMessageRoutes = require("./routes/groupMessageRoutes");
const messageActionRoutes = require("./routes/messageActionRoutes");
console.log("✅ [DEBUG] Models and routes loaded successfully");

// App & Server Setup
console.log("🚀 [DEBUG] Setting up Express app and HTTP server...");
const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});
app.set("io", io);
const pendingCalls = new Map();
const pendingOffers = new Map();
const pendingIce = new Map();
const CALL_TTL_MS = 60000;
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

app.use("/api/groups", groupRoutes);
app.use("/api/group-messages", groupMessageRoutes);
app.use("/api/message-actions", messageActionRoutes);
console.log("✅ [DEBUG] Route mounted: /api/groups (Firebase-authenticated)");

// Lightweight health endpoint for Render and uptime checks.
app.get("/", (req, res) => {
  res.status(200).json({ success: true, status: "ok", service: "user-chat-api" });
});
app.head("/", (req, res) => res.sendStatus(200));

// Request logging middleware (for all API routes).
app.use((req, res, next) => {
  console.log(`📥 [DEBUG] ${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  if (req.method !== "GET" && req.method !== "HEAD") {
    const bodyText = req.body === undefined ? "" : JSON.stringify(req.body);
    if (bodyText) console.log("📥 [DEBUG] Request body:", bodyText.slice(0, 500));
  }
  const originalSend = res.send;
  res.send = function(data) {
    console.log(`📤 [DEBUG] Response ${res.statusCode} for ${req.method} ${req.originalUrl}`);
    return originalSend.call(this, data);
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
    const normalizedUserId = String(userId?._id || userId?.userId || userId);
    if (!mongoose.Types.ObjectId.isValid(normalizedUserId)) return;
    socket.join(normalizedUserId);
    socket.data.userId = normalizedUserId;

    try {
      await User.findByIdAndUpdate(normalizedUserId, { online: true, lastSeen: null });
      console.log(`✅ [DEBUG] User ${userId} marked as online`);
      
      io.emit("userOnline", userId);
      const pending = pendingCalls.get(normalizedUserId);
      if (pending && pending.expiresAt > Date.now()) {
        socket.emit("incomingCall", { from: pending.from, fromUser: pending.fromUser, mediaMode: pending.mediaMode });
        const offer = pendingOffers.get(normalizedUserId);
        if (offer && offer.expiresAt > Date.now()) socket.emit("webrtc-offer", offer.payload);
        (pendingIce.get(normalizedUserId) || []).forEach((item) => socket.emit("webrtc-ice", item.payload));
      } else if (pending) {
        pendingCalls.delete(normalizedUserId); pendingOffers.delete(normalizedUserId); pendingIce.delete(normalizedUserId);
      }
      console.log(`📢 [DEBUG] Broadcasted 'userOnline' event for userId: ${userId}`);
    } catch (err) {      console.error(`❌ [DEBUG] Error updating user ${userId} on join:`, err.message);
      console.error("❌ [DEBUG] Error stack:", err.stack);
    }
  });

  // Authenticate group room joins before allowing real-time group events.
  socket.on("group:join", async ({ groupId, token } = {}) => {
    try {
      if (!groupId || !token) return;
      const decoded = await admin.auth().verifyIdToken(token);
      const member = await User.findOne({ firebaseUid: decoded.uid }).select("_id");
      if (!member) return;
      const Group = require("./models/Group");
      const group = await Group.findOne({ _id: groupId, members: member._id }).select("_id");
      if (!group) return;
      socket.join("group:" + groupId);
      socket.data.groupUserId = String(member._id);
      socket.data.groupId = String(groupId);
      socket.emit("group:joined", { groupId });
    } catch (error) {
      console.warn("[SOCKET_GROUP_JOIN] Rejected:", error.code || error.message);
    }
  });

  socket.on("group:leave", ({ groupId } = {}) => {
    if (!groupId) return;
    socket.leave("group:" + groupId);
    if (String(socket.data.groupId) === String(groupId)) {
      socket.data.groupId = null;
      socket.data.groupUserId = null;
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
    if (to && from && String(from) === String(socket.data.userId)) io.to(String(to)).emit("peerTyping", String(from));
  });
  socket.on("typing:stop", ({ from, to }) => {
    if (to && from && String(from) === String(socket.data.userId)) io.to(String(to)).emit("peerTypingStop", String(from));
  });
  socket.on("group:typing", ({ groupId, from, typing } = {}) => {
    if (!groupId || String(from) !== String(socket.data.userId) || String(socket.data.groupId) !== String(groupId)) return;
    socket.to("group:" + String(groupId)).emit("group:typing", { groupId: String(groupId), from: String(from), typing: !!typing });
  });
  socket.on("recording:request", ({ to, from } = {}) => {
    if (to && from && String(from) === String(socket.data.userId)) io.to(String(to)).emit("recording:request", { from: String(from) });
  });
  socket.on("recording:consent", ({ to, from, accepted } = {}) => {
    if (to && from && String(from) === String(socket.data.userId)) io.to(String(to)).emit("recording:consent", { from: String(from), accepted: !!accepted });
  });

  // One-to-one call invitation and lifecycle signaling + background push.
  socket.on("call", async (data = {}) => {
    const from = String(data.from || "");
    const to = String(data.to || "");
    if (!to || !from || from !== String(socket.data.userId || "")) return;
    const caller = await User.findById(from).select("username name avatar").lean().catch(() => null);
    const fromUser = caller || data.fromUser || {};
    const mediaMode = data.mediaMode === "video" ? "video" : "audio";
    pendingCalls.set(to, { from, fromUser, mediaMode, expiresAt: Date.now() + CALL_TTL_MS });
    io.to(to).emit("incomingCall", { from, fromUser, mediaMode });
    sendPushToUser(to, { title: caller?.name || caller?.username || "Incoming call", body: mediaMode === "video" ? "Incoming video call" : "Incoming voice call", ttl: 60, urgency: "high", data: { type: "incoming_call", from, mode: mediaMode, url: "/", tag: "sura-call-" + from } });
  });
  socket.on("callAccepted", (data = {}) => {
    if (data.to && data.from && String(data.from) === String(socket.data.userId || "")) {
      pendingCalls.delete(String(data.from)); pendingOffers.delete(String(data.from)); pendingIce.delete(String(data.from));
      io.to(String(data.to)).emit("callAccepted", { from: data.from });
    }
  });
  socket.on("callDeclined", (data = {}) => {
    if (data.to && data.from && String(data.from) === String(socket.data.userId || "")) {
      pendingCalls.delete(String(data.from)); pendingOffers.delete(String(data.from)); pendingIce.delete(String(data.from));
      io.to(String(data.to)).emit("callDeclined", { from: data.from });
    }
  });
  socket.on("callEnded", (data = {}) => {
    if (data.to && data.from && String(data.from) === String(socket.data.userId || "")) {
      [String(data.to), String(data.from)].forEach((id) => { pendingCalls.delete(id); pendingOffers.delete(id); pendingIce.delete(id); });
      io.to(String(data.to)).emit("callEnded", { from: data.from });
    }
  });

  socket.on("webrtc-offer", (data) => {
    console.log("📞 [DEBUG] WebRTC 'webrtc-offer' event:", {
      from: data?.from,
      to: data?.to,
      socketId: socket.id,
      hasSdp: !!data?.sdp
    });
    if (data?.to && String(data.from) === String(socket.data.userId || "")) {
      const payload = { from: data.from, to: String(data.to), sdp: data.sdp };
      pendingOffers.set(String(data.to), { payload, expiresAt: Date.now() + CALL_TTL_MS });
      io.to(String(data.to)).emit("webrtc-offer", payload);
      console.log(`✅ [DEBUG] WebRTC offer forwarded to: ${data.to}`);
    }
  });

  socket.on("webrtc-answer", (data) => {
    console.log("📞 [DEBUG] WebRTC 'webrtc-answer' event:", {
      from: data?.from,      to: data?.to,
      socketId: socket.id,
      hasSdp: !!data?.sdp
    });
    if (data?.to && String(data.from) === String(socket.data.userId || "")) {
      const target = String(data.to);
      const payload = { from: data.from, to: target, candidate: data.candidate };
      const queued = pendingIce.get(target) || [];
      queued.push({ payload, expiresAt: Date.now() + CALL_TTL_MS });
      pendingIce.set(target, queued.slice(-40));
      io.to(target).emit("webrtc-ice", payload);
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
    const id = socket.data.userId;
    if (!id) return;
    try {
      const remaining = await io.in(String(id)).fetchSockets();
      if (remaining.length) return;
      const lastSeen = new Date();
      await User.findByIdAndUpdate(id, { online: false, lastSeen });
      io.emit("userOffline", { userId: String(id), lastSeen });
    } catch (err) {
      console.error("[PRESENCE_DISCONNECT]", err.message);
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
  console.log(`   - GET/POST/PATCH/DELETE /api/groups/* (Firebase-authenticated)`);
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