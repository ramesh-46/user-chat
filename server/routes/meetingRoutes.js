const router = require("express").Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Meeting = require("../models/Meeting");
const firebaseAuth = require("../middleware/firebaseAuth");

router.use(firebaseAuth);

// Create a random, unguessable room. Only the passcode hash is stored in MongoDB.
router.post("/", async (req, res) => {
  try {
    const title = String(req.body?.title || "Sura Chat meeting").trim().slice(0, 100) || "Sura Chat meeting";
    const passcode = String(req.body?.passcode || "").trim();
    if (passcode && (passcode.length < 4 || passcode.length > 32)) {
      return res.status(400).json({ success: false, error: "Meeting code must be 4–32 characters" });
    }
    const roomId = crypto.randomUUID().replace(/-/g, "");
    const passcodeHash = passcode ? await bcrypt.hash(passcode, 10) : null;
    const meeting = await Meeting.create({
      roomId, title, host: req.user._id, hasPasscode: !!passcode,
      passcodeHash, expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000)
    });
    return res.status(201).json({ success: true, meeting: {
      roomId: meeting.roomId, title: meeting.title, hasPasscode: meeting.hasPasscode,
      expiresAt: meeting.expiresAt, host: String(meeting.host)
    }});
  } catch (error) {
    console.error("[MEETING_CREATE]", error);
    return res.status(500).json({ success: false, error: "Unable to create meeting" });
  }
});

// Validate the app-level meeting code before revealing the Jitsi room.
router.post("/:roomId/join", async (req, res) => {
  try {
    const roomId = String(req.params.roomId || "");
    if (!/^[a-f0-9]{32}$/.test(roomId)) return res.status(404).json({ success: false, error: "Meeting not found" });
    const meeting = await Meeting.findOne({ roomId, expiresAt: { $gt: new Date() } }).select("+passcodeHash");
    if (!meeting) return res.status(404).json({ success: false, error: "Meeting has expired or does not exist" });
    if (meeting.hasPasscode) {
      const passcode = String(req.body?.passcode || "");
      const valid = passcode && meeting.passcodeHash && await bcrypt.compare(passcode, meeting.passcodeHash);
      if (!valid) return res.status(403).json({ success: false, error: "Incorrect meeting code" });
    }
    return res.json({ success: true, meeting: {
      roomId: meeting.roomId, title: meeting.title, hasPasscode: meeting.hasPasscode,
      isHost: String(meeting.host) === String(req.user._id)
    }});
  } catch (error) {
    console.error("[MEETING_JOIN]", error);
    return res.status(500).json({ success: false, error: "Unable to join meeting" });
  }
});

module.exports = router;
