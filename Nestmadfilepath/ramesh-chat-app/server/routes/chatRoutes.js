// const router  = require("express").Router();
// const User    = require("../models/User");
// const Message = require("../models/Message");
// const upload  = require("../utils/upload");     // multer config (accepts images & mp4)

// const DeletedAccount = require("../models/DeletedAccount");

// /* 🔎 User search – by mobile OR username */
// router.get("/users", async (req, res) => {
//   const { mobile, username } = req.query;
//   const query = mobile
//     ? { mobile }
//     : { username: username?.toLowerCase() };
//   const user = await User.findOne(query);
//   res.json({ success: !!user, user });
// });

// /* 📋 Conversation list (latest message per peer) */
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

//     // OPTIONAL: Find all users who have chatted with this user
//     const messages = await Message.find({
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
//              : "image";
//   }
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
  const { mobile, username } = req.query;
  const query = mobile ? { mobile } : { username: username?.toLowerCase() };
  const user = await User.findOne(query);
  res.json({ success: !!user, user });
});

/* 📋 Conversation list (latest message per peer) */
router.get("/conversations/:userId", async (req, res) => {
  const { userId } = req.params;
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
  res.json({ success: true, conversations: list });
});

/* 💬 Send message (text / file) */
router.post("/messages", upload.single("file"), async (req, res) => {
  try {
    const { sender, receiver, text, content, fileType } = req.body;

    if (!sender || !receiver) {
      return res.status(400).json({ error: "Sender and receiver are required" });
    }

    // Check if the receiver has blocked the sender
    const receiverUser = await User.findById(receiver);
    if (receiverUser.blockList.includes(sender)) {
      return res.status(403).json({ error: "You are blocked by this user" });
    }

    let filePath, mime;

    if (req.file) {
      filePath = `/uploads/${req.file.filename}`;
      mime = req.file.mimetype;
    }

    const msg = await Message.create({
      sender,
      receiver,
      text,
      file: filePath,
      fileType,
      mime,
      content: content ? JSON.parse(content) : null,
    });

    res.json({ success: true, message: msg });
  } catch (err) {
    console.error("Error in /messages:", err);
    res.status(500).json({ error: "Failed to send message" });
  }
});

/* Block a user */
router.post("/block/:userId/:peerId", async (req, res) => {
  try {
    const { userId, peerId } = req.params;
    await User.findByIdAndUpdate(userId, { $addToSet: { blockList: peerId } });
    res.json({ success: true });
  } catch (err) {
    console.error("Error blocking user:", err);
    res.status(500).json({ error: "Failed to block user" });
  }
});

/* Unblock a user */
router.post("/unblock/:userId/:peerId", async (req, res) => {
  try {
    const { userId, peerId } = req.params;
    await User.findByIdAndUpdate(userId, { $pull: { blockList: peerId } });
    res.json({ success: true });
  } catch (err) {
    console.error("Error unblocking user:", err);
    res.status(500).json({ error: "Failed to unblock user" });
  }
});

/* Check if a user is blocked */
router.get("/isBlocked/:userId/:peerId", async (req, res) => {
  try {
    const { userId, peerId } = req.params;
    const user = await User.findById(userId);
    const isBlocked = user.blockList.includes(peerId);
    res.json({ isBlocked });
  } catch (err) {
    console.error("Error checking block status:", err);
    res.status(500).json({ error: "Failed to check block status" });
  }
});

/* GET /api/chatlist/:userId */
router.get("/chatlist/:userId", async (req, res) => {
  try {
    const userId = req.params.userId;

    // Find current user
    const currentUser = await User.findById(userId);
    if (!currentUser) {
      return res.status(404).json({ error: "User not found" });
    }

    // OPTIONAL: Find all users who have chatted with this user
    const messages = await Message.find({
      $or: [{ sender: userId }, { receiver: userId }],
    }).sort({ updatedAt: -1 });

    const partnerIds = new Set();

    messages.forEach((msg) => {
      if (msg.sender.toString() !== userId) partnerIds.add(msg.sender.toString());
      if (msg.receiver.toString() !== userId) partnerIds.add(msg.receiver.toString());
    });

    // Fetch users involved in chats
    const users = await User.find({ _id: { $in: Array.from(partnerIds) } });

    // Attach last message to each
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

        return {
          _id: u._id,
          username: u.username,
          mobile: u.mobile,
          lastText: last?.text || "",
        };
      })
    );

    res.json({ users: usersWithLastMsg });
  } catch (err) {
    console.error("Failed to load chat list:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* ——— toggle star ——— */
router.put("/star/:id", async (req, res) => {
  const msg = await Message.findByIdAndUpdate(
    req.params.id,
    { $set: { starred: req.body.starred } },
    { new: true }
  );
  res.json(msg);
});

/* ——— pin chat ——— */
router.post("/pin/:userId/:peerId", async (req, res) => {
  const { userId, peerId } = req.params;
  await User.findByIdAndUpdate(userId, { pinned: peerId }); // simple single-pin
  res.json({ ok: true });
});

/* 📜 History between two users */
router.get("/messages/:u1/:u2", async (req, res) => {
  const { u1, u2 } = req.params;
  const msgs = await Message.find({
    $or: [
      { sender: u1, receiver: u2 },
      { sender: u2, receiver: u1 },
    ],
  }).sort("createdAt");
  res.json({ success: true, messages: msgs });
});

module.exports = router;
