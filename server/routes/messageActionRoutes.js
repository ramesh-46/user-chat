const express = require("express");
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { pipeline } = require("stream/promises");
const Message = require("../models/Message");
const Group = require("../models/Group");
const User = require("../models/User");
const firebaseAuth = require("../middleware/firebaseAuth");
const { sendPushToUser, sendPushToUsers } = require("../services/pushNotifications");

const router = express.Router();
router.use(firebaseAuth);
const privateDir = path.join(__dirname, "..", "private_uploads");
fs.mkdirSync(privateDir, { recursive: true });
const validId = (id) => mongoose.Types.ObjectId.isValid(id);

async function copyMediaForDestination(source, destinationType) {
  if (!source.file) return undefined;
  const directMatch = String(source.file).match(/^\/api\/media\/([a-f0-9]{24})$/i);
  const bucket = mongoose.connection.db
    ? new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: "directChatMedia" })
    : null;

  if (destinationType === "group") {
    if (!directMatch) return path.basename(String(source.file));
    if (!bucket) throw new Error("Media storage is unavailable");
    const filename = crypto.randomUUID() + ".media";
    await pipeline(bucket.openDownloadStream(new mongoose.Types.ObjectId(directMatch[1])), fs.createWriteStream(path.join(privateDir, filename)));
    return filename;
  }

  if (directMatch) return source.file;
  if (!bucket) throw new Error("Media storage is unavailable");
  const filename = path.basename(String(source.file));
  const sourcePath = path.join(privateDir, filename);
  if (!fs.existsSync(sourcePath)) throw new Error("The original attachment is no longer available");
  const upload = bucket.openUploadStream("forwarded-" + filename, { contentType: source.mime || "application/octet-stream" });
  await pipeline(fs.createReadStream(sourcePath), upload);
  return "/api/media/" + String(upload.id);
}

router.delete("/:messageId", async (req, res) => {
  try {
    if (!validId(req.params.messageId)) return res.status(400).json({ success: false, error: "Invalid message ID" });
    const message = await Message.findById(req.params.messageId);
    if (!message || message.groupId) return res.status(404).json({ success: false, error: "Message not found" });
    const userId = String(req.user._id);
    const senderId = String(message.sender);
    const receiverId = String(message.receiver);
    if (userId !== senderId && userId !== receiverId) return res.status(404).json({ success: false, error: "Message not found" });
    const forEveryone = req.query.forEveryone === "true";
    if (forEveryone) {
      if (userId !== senderId) return res.status(403).json({ success: false, error: "Only the sender can delete for everyone" });
      message.deletedForEveryone = true; message.deletedAt = new Date(); message.text = ""; message.file = undefined;
      await message.save();
      const io = req.app.get("io");
      io?.to(senderId).emit("direct:message-deleted", { messageId: String(message._id), deletedForEveryone: true });
      io?.to(receiverId).emit("direct:message-deleted", { messageId: String(message._id), deletedForEveryone: true });
      return res.json({ success: true, deletedForEveryone: true });
    }
    await Message.updateOne({ _id: message._id }, { $addToSet: { deletedFor: req.user._id } });
    return res.json({ success: true, deletedForMe: true });
  } catch (error) {
    console.error("[DIRECT_MESSAGE_DELETE]", error);
    return res.status(500).json({ success: false, error: "Unable to delete message" });
  }
});

// Forward selected messages to one or more individual chats and/or groups.
router.post("/forward", async (req, res) => {
  try {
    const ids = Array.isArray(req.body?.messageIds) ? [...new Set(req.body.messageIds.map(String))] : [];
    const destinations = Array.isArray(req.body?.destinations) ? req.body.destinations : [];
    if (!ids.length || ids.length > 20 || !destinations.length || destinations.length > 10) {
      return res.status(400).json({ success: false, error: "Select 1–20 messages and 1–10 destinations" });
    }
    if (ids.some(id => !validId(id))) return res.status(400).json({ success: false, error: "Invalid message selection" });

    const sources = await Message.find({
      _id: { $in: ids }, deletedForEveryone: { $ne: true },
      deletedFor: { $ne: req.user._id }, viewOnce: { $ne: true }
    }).sort({ createdAt: 1 });
    if (sources.length !== ids.length) return res.status(404).json({ success: false, error: "One or more messages are no longer available to forward" });

    for (const source of sources) {
      if (source.groupId) {
        const member = await Group.exists({ _id: source.groupId, members: req.user._id });
        if (!member) return res.status(403).json({ success: false, error: "You cannot forward a message from that group" });
      } else if (String(source.sender) !== String(req.user._id) && String(source.receiver) !== String(req.user._id)) {
        return res.status(403).json({ success: false, error: "You cannot forward that message" });
      }
    }

    let forwardedCount = 0;
    const io = req.app.get("io");
    for (const destination of destinations) {
      const type = destination?.type;
      const id = String(destination?.id || "");
      if (!validId(id) || !["user", "group"].includes(type)) continue;
      let targetUser = null;
      let targetGroup = null;
      if (type === "user") {
        targetUser = await User.findById(id).select("_id username name blockList");
        if (!targetUser || String(targetUser._id) === String(req.user._id)) continue;
        if ((targetUser.blockList || []).some(value => String(value) === String(req.user._id))) continue;
      } else {
        targetGroup = await Group.findOne({ _id: id, members: req.user._id }).select("_id name members");
        if (!targetGroup) continue;
      }

      for (const source of sources) {
        const copiedFile = await copyMediaForDestination(source, type);
        const forwarded = await Message.create({
          sender: req.user._id,
          receiver: type === "user" ? targetUser._id : null,
          groupId: type === "group" ? targetGroup._id : null,
          text: source.text || "",
          file: copiedFile,
          fileType: source.fileType,
          mime: source.mime,
          content: source.content,
          forwarded: true
        });
        const payload = await Message.findById(forwarded._id).populate("sender", "username name avatar").lean();
        if (type === "user") {
          io?.to(String(targetUser._id)).emit("receiveMessage", payload);
          io?.to(String(req.user._id)).emit("receiveMessage", payload);
          sendPushToUser(targetUser._id, {
            title: req.user.name || req.user.username || "Forwarded message",
            body: source.text ? String(source.text).slice(0, 100) : "Forwarded an attachment",
            ttl: 3600,
            data: { type: "message", senderId: String(req.user._id), url: "/", tag: "forward-" + String(req.user._id) }
          });
        } else {
          io?.to("group:" + String(targetGroup._id)).emit("group:message", payload);
          sendPushToUsers((targetGroup.members || []).filter(member => String(member) !== String(req.user._id)), {
            title: targetGroup.name || "Group message",
            body: source.text ? String(source.text).slice(0, 100) : "Forwarded an attachment",
            ttl: 3600,
            data: { type: "group_message", groupId: String(targetGroup._id), url: "/", tag: "group-" + String(targetGroup._id) }
          });
        }
        forwardedCount += 1;
      }
    }
    if (!forwardedCount) return res.status(400).json({ success: false, error: "No valid destinations were selected" });
    return res.json({ success: true, forwardedCount });
  } catch (error) {
    console.error("[MESSAGE_FORWARD]", error);
    return res.status(500).json({ success: false, error: error.message || "Unable to forward messages" });
  }
});

module.exports = router;
