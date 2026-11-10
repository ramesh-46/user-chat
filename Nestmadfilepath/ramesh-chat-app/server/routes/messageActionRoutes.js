const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/Message");
const Group = require("../models/Group");
const User = require("../models/User");
const firebaseAuth = require("../middleware/firebaseAuth");

const router = express.Router();
router.use(firebaseAuth);

router.delete("/:messageId", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.messageId)) {
      return res.status(400).json({ success: false, error: "Invalid message ID" });
    }
    const message = await Message.findById(req.params.messageId);
    if (!message || message.groupId) return res.status(404).json({ success: false, error: "Message not found" });
    const userId = String(req.user._id);
    const senderId = String(message.sender);
    const receiverId = String(message.receiver);
    if (userId !== senderId && userId !== receiverId) return res.status(404).json({ success: false, error: "Message not found" });

    const forEveryone = req.query.forEveryone === "true";
    if (forEveryone) {
      if (userId !== senderId) return res.status(403).json({ success: false, error: "Only the sender can delete for everyone" });
      message.deletedForEveryone = true;
      message.deletedAt = new Date();
      message.text = "";
      message.file = undefined;
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


router.post("/forward", async (req, res) => {
  try {
    const unique = (value) => [...new Set((Array.isArray(value) ? value : []).map(String))];
    const messageIds = unique(req.body?.messageIds);
    const recipientIds = unique(req.body?.recipientIds);
    const groupIds = unique(req.body?.groupIds);
    if (!messageIds.length || messageIds.length > 50 || (!recipientIds.length && !groupIds.length) || recipientIds.length + groupIds.length > 20) {
      return res.status(400).json({ success: false, error: "Select up to 50 messages and at least one destination (maximum 20 destinations)." });
    }
    if (![...messageIds, ...recipientIds, ...groupIds].every(mongoose.Types.ObjectId.isValid)) {
      return res.status(400).json({ success: false, error: "One or more IDs are invalid." });
    }
    const userId = String(req.user._id);
    const [messages, recipients, groups] = await Promise.all([
      Message.find({ _id: { $in: messageIds }, deletedForEveryone: { $ne: true }, deletedFor: { $ne: req.user._id } }),
      recipientIds.length ? User.find({ _id: { $in: recipientIds } }).select("_id") : [],
      groupIds.length ? Group.find({ _id: { $in: groupIds }, members: req.user._id }).select("_id") : [],
    ]);
    if (messages.length !== messageIds.length) return res.status(404).json({ success: false, error: "One or more messages are no longer available." });
    if (recipients.length !== recipientIds.length || groups.length !== groupIds.length) {
      return res.status(403).json({ success: false, error: "A selected recipient or group is unavailable." });
    }
    for (const message of messages) {
      let canRead = String(message.sender) === userId || String(message.receiver || "") === userId;
      if (message.groupId) canRead = !!(await Group.exists({ _id: message.groupId, members: req.user._id }));
      if (!canRead) return res.status(403).json({ success: false, error: "You cannot forward a message you cannot access." });
      if (message.viewOnce) return res.status(400).json({ success: false, error: "View-once media cannot be forwarded." });
    }
    const io = req.app.get("io");
    let forwardedCount = 0;
    for (const message of messages) {
      const payload = { sender: req.user._id, text: message.text || "", file: message.file, fileType: message.fileType, mime: message.mime, content: message.content, replyTo: null };
      for (const recipient of recipients) {
        const forwarded = await Message.create({ ...payload, receiver: recipient._id, groupId: null });
        io?.to(String(recipient._id)).emit("receiveMessage", forwarded.toObject());
        io?.to(userId).emit("receiveMessage", forwarded.toObject());
        forwardedCount += 1;
      }
      for (const group of groups) {
        const forwarded = await Message.create({ ...payload, receiver: null, groupId: group._id });
        io?.to("group:" + String(group._id)).emit("group:message", forwarded.toObject());
        forwardedCount += 1;
      }
    }
    return res.json({ success: true, forwardedCount });
  } catch (error) {
    console.error("[MESSAGE_FORWARD]", error);
    return res.status(500).json({ success: false, error: "Unable to forward selected messages." });
  }
});

module.exports = router;
