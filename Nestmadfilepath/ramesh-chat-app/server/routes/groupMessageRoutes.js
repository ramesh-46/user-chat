const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const multer = require("multer");
const Message = require("../models/Message");
const Group = require("../models/Group");
const firebaseAuth = require("../middleware/firebaseAuth");

const router = express.Router();
router.use(firebaseAuth);

const privateDir = path.join(__dirname, "..", "private_uploads");
fs.mkdirSync(privateDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, privateDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || "").toLowerCase();
    cb(null, `${Date.now()}-${require("crypto").randomUUID()}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, _file, cb) => cb(null, true)
});

const validId = (id) => mongoose.Types.ObjectId.isValid(id);
async function memberGroup(groupId, userId) {
  if (!validId(groupId)) return null;
  return Group.findOne({ _id: groupId, members: userId });
}
function visibleMessage(message, userId) {
  return !message.deletedForEveryone &&
    !(message.deletedFor || []).some((id) => String(id) === String(userId));
}

// Get recent group messages (member only).
router.get("/:groupId/messages", async (req, res) => {
  try {
    const group = await memberGroup(req.params.groupId, req.user._id);
    if (!group) return res.status(404).json({ success: false, error: "Group not found" });
    const messages = await Message.find({
      groupId: group._id,
      deletedForEveryone: { $ne: true },
      deletedFor: { $ne: req.user._id }
    }).sort({ createdAt: 1 }).limit(200).populate("sender", "username name avatar").lean();
    const safe = messages.map((m) => {
      if (m.viewOnce && (m.openedBy || []).some((id) => String(id) === String(req.user._id))) {
        return { ...m, file: null, mediaUnavailable: true };
      }
      return m;
    });
    return res.json({ success: true, messages: safe });
  } catch (error) {
    console.error("[GROUP_MESSAGES_LIST]", error);
    return res.status(500).json({ success: false, error: "Unable to load group messages" });
  }
});

// Send text or private image/video to a group.
router.post("/:groupId/messages", upload.single("file"), async (req, res) => {
  try {
    const group = await memberGroup(req.params.groupId, req.user._id);
    if (!group) {
      if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
      return res.status(404).json({ success: false, error: "Group not found" });
    }
    const text = String(req.body.text || "").trim();
    if (!text && !req.file) return res.status(400).json({ success: false, error: "Message cannot be empty" });
    const viewOnce = ["true", "1"].includes(String(req.body.viewOnce).toLowerCase());
    const message = await Message.create({
      sender: req.user._id,
      groupId: group._id,
      text,
      file: req.file ? path.basename(req.file.filename) : undefined,
      fileType: req.file ? (req.file.mimetype.startsWith("image/") ? "image" : req.file.mimetype.startsWith("video/") ? "video" : req.file.mimetype.startsWith("audio/") ? "audio" : "document") : undefined,
      mime: req.file?.mimetype,
      viewOnce: !!(viewOnce && req.file),
    });
    group.updatedAt = new Date();
    await group.save();
    const populatedMessage = await Message.findById(message._id).populate("sender", "username name avatar").lean();
    req.app.get("io")?.to("group:" + String(group._id)).emit("group:message", populatedMessage);
    return res.status(201).json({ success: true, message: {
      ...populatedMessage,
      file: message.viewOnce ? null : message.file
    }});
  } catch (error) {
    if (req.file) fs.promises.unlink(req.file.path).catch(() => {});
    if (error instanceof multer.MulterError) return res.status(413).json({ success: false, error: "File is too large (100 MB maximum)" });
    console.error("[GROUP_MESSAGE_SEND]", error);
    return res.status(500).json({ success: false, error: error.message || "Unable to send group message" });
  }
});

// Delete for me or for everyone (only the sender can delete for everyone).
router.delete("/messages/:messageId", async (req, res) => {
  try {
    if (!validId(req.params.messageId)) return res.status(400).json({ success: false, error: "Invalid message ID" });
    const message = await Message.findById(req.params.messageId);
    if (!message || !message.groupId) return res.status(404).json({ success: false, error: "Message not found" });
    const group = await memberGroup(message.groupId, req.user._id);
    if (!group) return res.status(404).json({ success: false, error: "Message not found" });
    const forEveryone = req.query.forEveryone === "true";
    if (forEveryone) {
      if (String(message.sender) !== String(req.user._id)) return res.status(403).json({ success: false, error: "Only the sender can delete this message for everyone" });
      message.deletedForEveryone = true;
      message.deletedAt = new Date();
      message.text = "";
      message.file = undefined;
      await message.save();
      req.app.get("io")?.to("group:" + String(group._id)).emit("group:message-deleted", { messageId: String(message._id), deletedForEveryone: true });
      return res.json({ success: true, deletedForEveryone: true });
    }
    await Message.updateOne({ _id: message._id }, { $addToSet: { deletedFor: req.user._id } });
    return res.json({ success: true, deletedForMe: true });
  } catch (error) {
    console.error("[GROUP_MESSAGE_DELETE]", error);
    return res.status(500).json({ success: false, error: "Unable to delete message" });
  }
});

// One-time private media delivery. The first successful request marks it opened for that member.
router.get("/messages/:messageId/media", async (req, res) => {
  try {
    if (!validId(req.params.messageId)) return res.status(400).json({ success: false, error: "Invalid message ID" });
    const message = await Message.findById(req.params.messageId);
    if (!message || !message.groupId || !message.file || message.deletedForEveryone) {
      return res.status(404).json({ success: false, error: "Media not found" });
    }
    const group = await memberGroup(message.groupId, req.user._id);
    if (!group) return res.status(404).json({ success: false, error: "Media not found" });
    if (message.viewOnce) {
      const alreadyOpened = (message.openedBy || []).some((id) => String(id) === String(req.user._id));
      if (alreadyOpened) return res.status(410).json({ success: false, error: "This view-once media has already been opened" });
      const claimed = await Message.findOneAndUpdate(
        { _id: message._id, openedBy: { $ne: req.user._id }, deletedForEveryone: { $ne: true } },
        { $addToSet: { openedBy: req.user._id } },
        { new: true }
      );
      if (!claimed) return res.status(410).json({ success: false, error: "This media is no longer available" });
    }
    const filePath = path.join(privateDir, path.basename(message.file));
    if (!fs.existsSync(filePath)) return res.status(404).json({ success: false, error: "Media file is unavailable" });
    res.setHeader("Content-Type", message.mime || "application/octet-stream");
    res.setHeader("Cache-Control", "no-store, private");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return res.sendFile(filePath);
  } catch (error) {
    console.error("[GROUP_MEDIA_READ]", error);
    return res.status(500).json({ success: false, error: "Unable to open media" });
  }
});

module.exports = router;
