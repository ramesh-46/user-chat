// const router  = require("express").Router();
// const User    = require("../models/User");
// const Message = require("../models/Message");
// const upload  = require("../utils/upload");     // multer config (accepts images & mp4)

// const DeletedAccount = require("../models/DeletedAccount");

// /* 🔎 User search – by mobile OR username */
// router.get("/users", async (req, res) => {
//   const { mobile, username } = req.query;
//   const query = mobile
//     ? { mobile }
//     : { username: username?.toLowerCase() };
//   const user = await User.findOne(query);
//   res.json({ success: !!user, user });
// });

// /* 📋 Conversation list (latest message per peer) */
// router.get("/conversations/:userId", async (req, res) => {
//   const { userId } = req.params;
//   const list = await Message.aggregate([
//     {
//       $match: {
//         $or: [{ sender: userId }, { receiver: userId }]
//       }
//     },
//     { $sort: { createdAt: -1 } },
//     {
//       $group: {
//         _id: {
//           $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"]
//         },
//         lastMsg: { $first: "$$ROOT" }
//       }
//     },
//     {
//       $lookup: {
//         from: "users",
//         localField: "_id",
//         foreignField: "_id",
//         as: "peer"
//       }
//     },
//     { $unwind: "$peer" },
//     { $project: { peer: { mobile: 1, username: 1 }, lastMsg: 1 } },
//     { $sort: { "lastMsg.createdAt": -1 } }
//   ]);
//   res.json({ success: true, conversations: list });
// });
// /* 💬 Send message (text / file) */

// // POST /api/messages  (already exists)
// router.post("/messages", upload.single("file"), async (req, res) => {
//   try {
//     const { sender, receiver, text, content, fileType } = req.body;

//     if (!sender || !receiver) {
//       return res.status(400).json({ error: "Sender and receiver are required" });
//     }

//     let filePath, mime;

//     if (req.file) {
//       filePath = `/uploads/${req.file.filename}`;
//       mime = req.file.mimetype;
//     }

//     const msg = await Message.create({
//       sender,
//       receiver,
//       text,
//       file: filePath,
//       fileType,
//       mime,
//       content: content ? JSON.parse(content) : null,
//     });

//     res.json({ success: true, message: msg });
//   } catch (err) {
//     console.error("Error in /messages:", err);
//     res.status(500).json({ error: "Failed to send message" });
//   }
// });




// // GET /api/chatlist/:userId
// router.get("/chatlist/:userId", async (req, res) => {
//   try {
//     const userId = req.params.userId;

//     // Find current user
//     const currentUser = await User.findById(userId);
//     if (!currentUser) {
//       return res.status(404).json({ error: "User not found" });
//     }

//     // OPTIONAL: Find all users who have chatted with this user//     const messages = await Message.find({
//       $or: [{ sender: userId }, { receiver: userId }],
//     }).sort({ updatedAt: -1 });

//     const partnerIds = new Set();

//     messages.forEach((msg) => {
//       if (msg.sender.toString() !== userId) partnerIds.add(msg.sender.toString());
//       if (msg.receiver.toString() !== userId) partnerIds.add(msg.receiver.toString());
//     });

//     // Fetch users involved in chats
//     const users = await User.find({ _id: { $in: Array.from(partnerIds) } });

//     // Attach last message to each
//     const usersWithLastMsg = await Promise.all(
//       users.map(async (u) => {
//         const last = await Message.findOne({
//           $or: [
//             { sender: userId, receiver: u._id },
//             { sender: u._id, receiver: userId },
//           ],
//         })
//           .sort({ createdAt: -1 })
//           .limit(1);

//         return {
//           _id: u._id,
//           username: u.username,
//           mobile: u.mobile,
//           lastText: last?.text || "",
//         };
//       })
//     );

//     res.json({ users: usersWithLastMsg });
//   } catch (err) {
//     console.error("Failed to load chat list:", err);
//     res.status(500).json({ error: "Server error" });
//   }
// });
// router.post("/messages", upload.single("file"), async (req, res) => {
//   const { sender, receiver, text } = req.body;
//   let filePath, fileType;
//   if (req.file) {
//     filePath = `/uploads/${req.file.filename}`;
//     const mime = req.file.mimetype;
//     fileType = mime.startsWith("video") ? "video"
//              : mime.startsWith("audio") ? "audio"
//              : "image";//   }
//   const msg = await Message.create({ sender, receiver, text, file: filePath, fileType });
//   res.json({ success: true, message: msg });
// });

// /* ——— toggle star ——— */
// router.put("/star/:id", async (req, res) => {
//   const msg = await Message.findByIdAndUpdate(req.params.id,
//     { $set: { starred: req.body.starred } }, { new: true });
//   res.json(msg);
// });

// /* ——— pin chat ——— */
// router.post("/pin/:userId/:peerId", async (req, res) => {
//   const { userId, peerId } = req.params;
//   await User.findByIdAndUpdate(userId, { pinned: peerId }); // simple single‑pin
//   res.json({ ok: true });
// });
// /* 📜 History between two users */
// router.get("/messages/:u1/:u2", async (req, res) => {
//   const { u1, u2 } = req.params;
//   const msgs = await Message.find({
//     $or: [{ sender: u1, receiver: u2 }, { sender: u2, receiver: u1 }]
//   }).sort("createdAt");
//   res.json({ success: true, messages: msgs });
// });

// module.exports = router;


const router = require("express").Router();
const User = require("../models/User");
const Message = require("../models/Message");
const upload = require("../utils/upload");
const DeletedAccount = require("../models/DeletedAccount");

/* 🔎 User search – by mobile OR username */
router.get("/users", async (req, res) => {
  console.log("🔍 [DEBUG] GET /api/users - Request received");
  console.log("🔍 [DEBUG] Query params:", req.query);
  
  const { mobile, username } = req.query;
  const query = mobile ? { mobile } : { username: username?.toLowerCase() };
  
  console.log("🔍 [DEBUG] Search query:", JSON.stringify(query));
  
  try {
    const user = await User.findOne(query);
    console.log("🔍 [DEBUG] User found:", user ? `Yes (ID: ${user._id})` : "No");
    if (user) {      console.log("🔍 [DEBUG] User details:", { 
        _id: user._id, 
        username: user.username, 
        mobile: user.mobile 
      });
    }
    
    res.json({ success: !!user, user });
    console.log("🔍 [DEBUG] Response sent: success =", !!user);
  } catch (err) {
    console.error("❌ [DEBUG] Error in /users:", err);
    res.status(500).json({ error: "Failed to search user" });
  }
});

/* 📋 Conversation list (latest message per peer) */
router.get("/conversations/:userId", async (req, res) => {
  console.log("💬 [DEBUG] GET /api/conversations/:userId - Request received");
  const { userId } = req.params;
  console.log("💬 [DEBUG] userId param:", userId);
  
  try {
    console.log("💬 [DEBUG] Starting Message.aggregate pipeline...");
    const list = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { receiver: userId }],
        },
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ["$sender", userId] }, "$receiver", "$sender"],
          },
          lastMsg: { $first: "$$ROOT" },
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "peer",
        },
      },
      { $unwind: "$peer" },
      { $project: { peer: { mobile: 1, username: 1 }, lastMsg: 1 } },
      { $sort: { "lastMsg.createdAt": -1 } },
    ]);    
    console.log("💬 [DEBUG] Aggregate result count:", list.length);
    console.log("💬 [DEBUG] Conversations preview:", list.slice(0, 3).map(c => ({
      peerId: c.peer?._id,
      peerUsername: c.peer?.username,
      lastMsgId: c.lastMsg?._id,
      lastMsgText: c.lastMsg?.text?.substring(0, 50)
    })));
    
    res.json({ success: true, conversations: list });
    console.log("💬 [DEBUG] Response sent successfully");
  } catch (err) {
    console.error("❌ [DEBUG] Error in /conversations:", err);
    res.status(500).json({ error: "Failed to load conversations" });
  }
});

/* 💬 Send message (text / file) */
router.post("/messages", upload.single("file"), async (req, res) => {
  console.log("📤 [DEBUG] POST /api/messages - Request received");
  console.log("📤 [DEBUG] req.body:", {
    sender: req.body.sender,
    receiver: req.body.receiver,
    text: req.body.text?.substring(0, 100),
    content: req.body.content ? "present" : "null",
    fileType: req.body.fileType
  });
  
  if (req.file) {
    console.log("📤 [DEBUG] File uploaded:", {
      filename: req.file.filename,
      mimetype: req.file.mimetype,
      size: req.file.size,
      originalname: req.file.originalname
    });
  } else {
    console.log("📤 [DEBUG] No file uploaded (text-only message)");
  }
  
  try {
    const { sender, receiver, text, content, fileType } = req.body;

    if (!sender || !receiver) {
      console.warn("⚠️ [DEBUG] Missing sender or receiver in request");
      return res.status(400).json({ error: "Sender and receiver are required" });
    }

    // Check if the receiver has blocked the sender
    console.log("📤 [DEBUG] Checking if receiver has blocked sender...");
    const receiverUser = await User.findById(receiver);    console.log("📤 [DEBUG] Receiver user found:", !!receiverUser);
    
    if (receiverUser) {
      console.log("📤 [DEBUG] Receiver blockList:", receiverUser.blockList);
      if (receiverUser.blockList.includes(sender)) {
        console.warn("⚠️ [DEBUG] Sender is blocked by receiver - request rejected");
        return res.status(403).json({ error: "You are blocked by this user" });
      }
    }

    let filePath, mime;

    if (req.file) {
      filePath = `/uploads/${req.file.filename}`;
      mime = req.file.mimetype;
      console.log("📤 [DEBUG] File path set:", filePath, "MIME:", mime);
    }

    console.log("📤 [DEBUG] Creating Message document...");
    const msg = await Message.create({
      sender,
      receiver,
      text,
      file: filePath,
      fileType,
      mime,
      content: content ? JSON.parse(content) : null,
    });
    
    console.log("📤 [DEBUG] Message created successfully:", {
      _id: msg._id,
      sender: msg.sender,
      receiver: msg.receiver,
      hasText: !!msg.text,
      hasFile: !!msg.file,
      createdAt: msg.createdAt
    });

    res.json({ success: true, message: msg });
    console.log("📤 [DEBUG] Response sent successfully");
  } catch (err) {
    console.error("❌ [DEBUG] Error in /messages:", err);
    console.error("❌ [DEBUG] Error details:", {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: "Failed to send message" });
  }
});
/* Block a user */
router.post("/block/:userId/:peerId", async (req, res) => {
  console.log("🚫 [DEBUG] POST /api/block/:userId/:peerId - Request received");
  console.log("🚫 [DEBUG] Params:", { userId: req.params.userId, peerId: req.params.peerId });
  
  try {
    const { userId, peerId } = req.params;
    console.log("🚫 [DEBUG] Adding peerId to user's blockList...");
    
    const result = await User.findByIdAndUpdate(
      userId, 
      { $addToSet: { blockList: peerId } },
      { new: true }
    );
    
    console.log("🚫 [DEBUG] Update result:", {
      userFound: !!result,
      blockList: result?.blockList
    });
    
    res.json({ success: true });
    console.log("🚫 [DEBUG] Response sent: user blocked successfully");
  } catch (err) {
    console.error("❌ [DEBUG] Error blocking user:", err);
    res.status(500).json({ error: "Failed to block user" });
  }
});

/* Unblock a user */
router.post("/unblock/:userId/:peerId", async (req, res) => {
  console.log("✅ [DEBUG] POST /api/unblock/:userId/:peerId - Request received");
  console.log("✅ [DEBUG] Params:", { userId: req.params.userId, peerId: req.params.peerId });
  
  try {
    const { userId, peerId } = req.params;
    console.log("✅ [DEBUG] Removing peerId from user's blockList...");
    
    const result = await User.findByIdAndUpdate(
      userId, 
      { $pull: { blockList: peerId } },
      { new: true }
    );
    
    console.log("✅ [DEBUG] Update result:", {
      userFound: !!result,
      blockList: result?.blockList
    });
    
    res.json({ success: true });    console.log("✅ [DEBUG] Response sent: user unblocked successfully");
  } catch (err) {
    console.error("❌ [DEBUG] Error unblocking user:", err);
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

/* Check if a user is blocked */
router.get("/isBlocked/:userId/:peerId", async (req, res) => {
  console.log("🔐 [DEBUG] GET /api/isBlocked/:userId/:peerId - Request received");
  console.log("🔐 [DEBUG] Params:", { userId: req.params.userId, peerId: req.params.peerId });
  
  try {
    const { userId, peerId } = req.params;
    console.log("🔐 [DEBUG] Fetching user to check block status...");
    
    const user = await User.findById(userId);
    console.log("🔐 [DEBUG] User found:", !!user);
    
    if (user) {
      console.log("🔐 [DEBUG] User's blockList:", user.blockList);
      const isBlocked = user.blockList.includes(peerId);
      console.log("🔐 [DEBUG] Is peerId blocked?", isBlocked);
      res.json({ isBlocked });
    } else {
      console.warn("⚠️ [DEBUG] User not found for block check");
      res.json({ isBlocked: false });
    }
    console.log("🔐 [DEBUG] Response sent successfully");
  } catch (err) {
    console.error("❌ [DEBUG] Error checking block status:", err);
    res.status(500).json({ error: "Failed to check block status" });
  }
});

/* GET /api/chatlist/:userId */
router.get("/chatlist/:userId", async (req, res) => {
  console.log("📋 [DEBUG] GET /api/chatlist/:userId - Request received");
  console.log("📋 [DEBUG] userId param:", req.params.userId);
  
  try {
    const userId = req.params.userId;

    // Find current user
    console.log("📋 [DEBUG] Finding currentUser by ID...");
    const currentUser = await User.findById(userId);
    console.log("📋 [DEBUG] currentUser found:", !!currentUser);
    
    if (!currentUser) {
      console.warn("⚠️ [DEBUG] User not found - returning 404");      return res.status(404).json({ error: "User not found" });
    }

    // OPTIONAL: Find all users who have chatted with this user
    console.log("📋 [DEBUG] Fetching messages for chat history...");
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).sort({ updatedAt: -1 });
    
    console.log("📋 [DEBUG] Messages found:", messages.length);
    console.log("📋 [DEBUG] First 3 messages preview:", messages.slice(0, 3).map(m => ({
      _id: m._id,
      sender: m.sender,
      receiver: m.receiver,
      text: m.text?.substring(0, 30)
    })));

    const partnerIds = new Set();

    messages.forEach((msg) => {
      if (msg.sender.toString() !== userId) partnerIds.add(msg.sender.toString());
      if (msg.receiver.toString() !== userId) partnerIds.add(msg.receiver.toString());
    });
    
    console.log("📋 [DEBUG] Unique partner IDs extracted:", partnerIds.size);
    console.log("📋 [DEBUG] Partner IDs:", Array.from(partnerIds));

    // Fetch users involved in chats
    console.log("📋 [DEBUG] Fetching partner users from DB...");
    const users = await User.find({ _id: { $in: Array.from(partnerIds) } });
    console.log("📋 [DEBUG] Partner users found:", users.length);
    console.log("📋 [DEBUG] Partner users preview:", users.slice(0, 3).map(u => ({
      _id: u._id,
      username: u.username,
      mobile: u.mobile
    })));

    // Attach last message to each
    console.log("📋 [DEBUG] Attaching last message to each partner...");
    const usersWithLastMsg = await Promise.all(
      users.map(async (u) => {
        const last = await Message.findOne({
          $or: [
            { sender: userId, receiver: u._id },
            { sender: u._id, receiver: userId },
          ],
        })
          .sort({ createdAt: -1 })
          .limit(1);
                console.log("📋 [DEBUG] Last message for user", u._id, ":", last ? "found" : "none");

        return {
          _id: u._id,
          username: u.username,
          mobile: u.mobile,
          lastText: last?.text || "",
        };
      })
    );
    
    console.log("📋 [DEBUG] Final chatlist result count:", usersWithLastMsg.length);
    console.log("📋 [DEBUG] Chatlist preview:", usersWithLastMsg.slice(0, 3));

    res.json({ users: usersWithLastMsg });
    console.log("📋 [DEBUG] Response sent successfully");
  } catch (err) {
    console.error("❌ [DEBUG] Failed to load chat list:", err);
    console.error("❌ [DEBUG] Error details:", {
      name: err.name,
      message: err.message,
      stack: err.stack
    });
    res.status(500).json({ error: "Server error" });
  }
});

/* ——— toggle star ——— */
router.put("/star/:id", async (req, res) => {
  console.log("⭐ [DEBUG] PUT /api/star/:id - Request received");
  console.log("⭐ [DEBUG] Params:", { id: req.params.id });
  console.log("⭐ [DEBUG] Body:", req.body);
  
  try {
    const msg = await Message.findByIdAndUpdate(
      req.params.id,
      { $set: { starred: req.body.starred } },
      { new: true }
    );
    
    console.log("⭐ [DEBUG] Message update result:", {
      found: !!msg,
      _id: msg?._id,
      starred: msg?.starred
    });
    
    res.json(msg);
    console.log("⭐ [DEBUG] Response sent successfully");
  } catch (err) {
    console.error("❌ [DEBUG] Error in /star:", err);    res.status(500).json({ error: "Failed to toggle star" });
  }
});

/* ——— pin chat ——— */
router.post("/pin/:userId/:peerId", async (req, res) => {
  console.log("📌 [DEBUG] POST /api/pin/:userId/:peerId - Request received");
  console.log("📌 [DEBUG] Params:", { userId: req.params.userId, peerId: req.params.peerId });
  
  try {
    const { userId, peerId } = req.params;
    console.log("📌 [DEBUG] Setting pinned chat for user...");
    
    const result = await User.findByIdAndUpdate(userId, { pinned: peerId });
    console.log("📌 [DEBUG] Update result:", {
      userFound: !!result,
      newPinned: peerId
    });
    
    res.json({ ok: true });
    console.log("📌 [DEBUG] Response sent: chat pinned successfully");
  } catch (err) {
    console.error("❌ [DEBUG] Error in /pin:", err);
    res.status(500).json({ error: "Failed to pin chat" });
  }
});

/* 📜 History between two users */
router.get("/messages/:u1/:u2", async (req, res) => {
  console.log("📜 [DEBUG] GET /api/messages/:u1/:u2 - Request received");
  console.log("📜 [DEBUG] Params:", { u1: req.params.u1, u2: req.params.u2 });
  
  try {
    const { u1, u2 } = req.params;
    console.log("📜 [DEBUG] Fetching message history between users...");
    
    const msgs = await Message.find({
      $or: [
        { sender: u1, receiver: u2 },
        { sender: u2, receiver: u1 },
      ],
    }).sort("createdAt");
    
    console.log("📜 [DEBUG] Messages found:", msgs.length);
    console.log("📜 [DEBUG] Messages preview (first 5):", msgs.slice(0, 5).map(m => ({
      _id: m._id,
      sender: m.sender,
      receiver: m.receiver,
      text: m.text?.substring(0, 50),
      hasFile: !!m.file,      createdAt: m.createdAt
    })));
    
    res.json({ success: true, messages: msgs });
    console.log("📜 [DEBUG] Response sent successfully");
  } catch (err) {
    console.error("❌ [DEBUG] Error in /messages/:u1/:u2:", err);
    res.status(500).json({ error: "Failed to load message history" });
  }
});

module.exports = router;