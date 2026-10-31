const express = require("express");
const mongoose = require("mongoose");
const Message = require("../models/Message");
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

module.exports = router;
