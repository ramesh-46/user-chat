const router = require("express").Router();
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Meeting = require("../models/Meeting");
const MeetingInvite = require("../models/MeetingInvite");
const User = require("../models/User");
const firebaseAuth = require("../middleware/firebaseAuth");
const { sendPushToUser } = require("../services/pushNotifications");

router.use(firebaseAuth);

const MEETING_TTL_MS = 24 * 60 * 60 * 1000; // links stay valid for 24 hours

// Google Meet-style public code: xxx-yyyy-zzz (lowercase letters).
function makeMeetingCode() {
  const letters = "abcdefghijkmnpqrstuvwxyz";
  const pick = (n) => Array.from({ length: n }, () => letters[crypto.randomInt(letters.length)]).join("");
  return `${pick(3)}-${pick(4)}-${pick(3)}`;
}

// Create a meeting. Returns the public code plus the join link room id.
router.post("/", async (req, res) => {
  try {
    const title = String(req.body?.title || "Sura Chat meeting").trim().slice(0, 120) || "Sura Chat meeting";
    const passcode = String(req.body?.passcode || "").trim();
    if (passcode && (passcode.length < 4 || passcode.length > 32)) {
      return res.status(400).json({ success: false, error: "Passcode must be 4–32 characters" });
    }
    const waitingRoom = req.body?.waitingRoom === undefined ? true : !!req.body.waitingRoom;
    let scheduledAt = null;
    if (req.body?.scheduledAt) {
      const parsed = new Date(req.body.scheduledAt);
      if (Number.isNaN(parsed.getTime())) return res.status(400).json({ success: false, error: "Invalid schedule date" });
      scheduledAt = parsed;
    }
    const roomId = crypto.randomBytes(16).toString("hex");
    const passcodeHash = passcode ? await bcrypt.hash(passcode, 10) : null;
    const meeting = await Meeting.create({
      roomId,
      code: makeMeetingCode(),
      title,
      host: req.user._id,
      hasPasscode: !!passcode,
      passcodeHash,
      waitingRoom,
      scheduledAt,
      startedAt: scheduledAt ? null : new Date(),
      expiresAt: new Date(Date.now() + MEETING_TTL_MS)
    });
    return res.status(201).json({ success: true, meeting: {
      roomId: meeting.roomId, code: meeting.code, title: meeting.title,
      hasPasscode: meeting.hasPasscode, waitingRoom: meeting.waitingRoom,
      scheduledAt: meeting.scheduledAt, expiresAt: meeting.expiresAt,
      isHost: true
    }});
  } catch (error) {
    console.error("[MEETING_CREATE]", error);
    return res.status(500).json({ success: false, error: "Unable to create meeting" });
  }
});

// Meetings created by the signed-in user that have not ended or expired.
router.get("/mine", async (req, res) => {
  try {
    const meetings = await Meeting.find({
      host: req.user._id, status: "live", expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).limit(20).select("roomId code title waitingRoom hasPasscode scheduledAt createdAt");
    return res.json({ success: true, meetings });
  } catch (error) {
    console.error("[MEETING_MINE]", error);
    return res.status(500).json({ success: false, error: "Unable to load meetings" });
  }
});

// Pending invitations received by the signed-in user.
router.get("/invites", async (req, res) => {
  try {
    const invites = await MeetingInvite.find({
      to: req.user._id, status: "pending", expiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).limit(20).populate("from", "name username");
    return res.json({ success: true, invites });
  } catch (error) {
    console.error("[MEETING_INVITES]", error);
    return res.status(500).json({ success: false, error: "Unable to load invitations" });
  }
});

// Host sends the meeting to Sura Chat contacts as real invitations.
router.post("/\:roomId/invite", async (req, res) => {
  try {
    const meeting = await Meeting.findOne({
      roomId: String(req.params.roomId || "").toLowerCase(),
      status: "live", expiresAt: { $gt: new Date() }
    });
    if (!meeting) return res.status(404).json({ success: false, error: "Meeting not found" });
    if (String(meeting.host) !== String(req.user._id)) {
      return res.status(403).json({ success: false, error: "Only the host can invite people" });
    }
    const userIds = [...new Set((Array.isArray(req.body?.userIds) ? req.body.userIds : []).map(String).filter(Boolean))]
      .filter((id) => id !== String(req.user._id)).slice(0, 50);
    if (!userIds.length) return res.status(400).json({ success: false, error: "Select at least one contact" });

    const sender = await User.findById(req.user._id).select("name username").lean();
    const docs = await MeetingInvite.create(userIds.map((u) => ({
      meeting: meeting._id, roomId: meeting.roomId, code: meeting.code, title: meeting.title,
      from: req.user._id, to: u, expiresAt: meeting.expiresAt
    })));

    const io = req.app.get("io");
    const senderName = sender?.name || sender?.username || "A Sura Chat user";
    docs.forEach((inv) => {
      const payload = {
        inviteId: String(inv._id), roomId: inv.roomId, code: inv.code, title: inv.title,
        from: { _id: String(inv.from), name: senderName }
      };
      if (io) io.to(String(inv.to)).emit("meeting\:invite", payload);
      sendPushToUser(String(inv.to), {
        title: "Meeting invitation",
        body: `${senderName} invited you to "${meeting.title}"`,
        data: { type: "meeting_invite", roomId: meeting.roomId, url: "/" }
      });
    });
    return res.json({ success: true, invited: docs.length });
  } catch (error) {
    console.error("[MEETING_INVITE]", error);
    return res.status(500).json({ success: false, error: "Unable to send invitations" });
  }
});

// Recipient accepts an invitation.
router.post("/invite/\:id/accept", async (req, res) => {
  try {
    const invite = await MeetingInvite.findOne({ _id: req.params.id, to: req.user._id, status: "pending" });
    if (!invite) return res.status(404).json({ success: false, error: "Invitation not found" });
    if (invite.expiresAt <= new Date()) {
      invite.status = "expired"; await invite.save();
      return res.status(410).json({ success: false, error: "This invitation has expired" });
    }
    invite.status = "accepted";
    await invite.save();
    const meeting = await Meeting.findOne({ roomId: invite.roomId, expiresAt: { $gt: new Date() } })
      .select("roomId code title hasPasscode waitingRoom status");
    if (!meeting || meeting.status === "ended") {
      return res.status(410).json({ success: false, error: "This meeting has ended" });
    }
    const io = req.app.get("io");
    if (io) {
      io.to(String(invite.from)).emit("meeting:invite-accepted", {
        roomId: invite.roomId, name: req.user.name || req.user.username || "Someone"
      });
    }
    return res.json({ success: true, meeting: {
      roomId: meeting.roomId, code: meeting.code, title: meeting.title,
      hasPasscode: meeting.hasPasscode, waitingRoom: meeting.waitingRoom, isHost: false
    }});
  } catch (error) {
    console.error("[MEETING_INVITE_ACCEPT]", error);
    return res.status(500).json({ success: false, error: "Unable to accept invitation" });
  }
});

// Recipient declines an invitation.
router.post("/invite/\:id/decline", async (req, res) => {
  try {
    const invite = await MeetingInvite.findOne({ _id: req.params.id, to: req.user._id, status: "pending" });
    if (!invite) return res.status(404).json({ success: false, error: "Invitation not found" });
    invite.status = "declined";
    await invite.save();
    const io = req.app.get("io");
    if (io) {
      io.to(String(invite.from)).emit("meeting\:invite-declined", {
        roomId: invite.roomId, name: req.user.name || req.user.username || "Someone"
      });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("[MEETING_INVITE_DECLINE]", error);
    return res.status(500).json({ success: false, error: "Unable to decline invitation" });
  }
});

// Join validation. Accepts the 32-hex room id (from the link) or the public
// xxx-yyyy-zzz code. Enforces passcode, ended, lock and removal rules.
router.post("/:id/join", async (req, res) => {
  try {
    const id = String(req.params.id || "").trim().toLowerCase();
    const isRoomId = /^[a-f0-9]{24,64}$/.test(id);
    if (!isRoomId && !/^[a-z]{3}-[a-z]{4}-[a-z]{3}$/.test(id)) {
      return res.status(404).json({ success: false, error: "Meeting not found" });
    }
    const query = { expiresAt: { $gt: new Date() } };
    if (isRoomId) query.roomId = id; else query.code = id;
    const meeting = await Meeting.findOne(query).select("+passcodeHash");
    if (!meeting) return res.status(404).json({ success: false, error: "Meeting has expired or does not exist" });
    const isHost = String(meeting.host) === String(req.user._id);
    if (meeting.status === "ended") return res.status(410).json({ success: false, error: "This meeting was ended by the host" });
    if ((meeting.removedUsers || []).some((u) => String(u) === String(req.user._id))) {
      return res.status(403).json({ success: false, error: "You were removed from this meeting" });
    }
    if (meeting.locked && !isHost) return res.status(403).json({ success: false, error: "The host has locked this meeting" });
    if (meeting.hasPasscode) {
      const passcode = String(req.body?.passcode || "");
      const valid = passcode && meeting.passcodeHash && await bcrypt.compare(passcode, meeting.passcodeHash);
      if (!valid) return res.status(403).json({ success: false, error: "Incorrect meeting passcode" });
    }
    return res.json({ success: true, meeting: {
      roomId: meeting.roomId, code: meeting.code, title: meeting.title,
      hasPasscode: meeting.hasPasscode, waitingRoom: meeting.waitingRoom,
      locked: meeting.locked, scheduledAt: meeting.scheduledAt, isHost
    }});
  } catch (error) {
    console.error("[MEETING_JOIN]", error);
    return res.status(500).json({ success: false, error: "Unable to join meeting" });
  }
});

// Host ends the meeting for everyone.
router.post("/:roomId/end", async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: String(req.params.roomId || "").toLowerCase() });
    if (!meeting) return res.status(404).json({ success: false, error: "Meeting not found" });
    if (String(meeting.host) !== String(req.user._id)) return res.status(403).json({ success: false, error: "Only the host can end the meeting" });
    meeting.status = "ended";
    meeting.endedAt = new Date();
    await meeting.save();
    const io = req.app.get("io");
    if (io) {
      io.to("meeting:" + meeting.roomId).emit("meeting\:ended", { roomId: meeting.roomId });
      io.to("meeting-wait:" + meeting.roomId).emit("meeting:ended", { roomId: meeting.roomId });
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("[MEETING_END]", error);
    return res.status(500).json({ success: false, error: "Unable to end meeting" });
  }
});

// Host removes a participant; they cannot rejoin this meeting.
router.post("/:roomId/remove", async (req, res) => {
  try {
    const meeting = await Meeting.findOne({ roomId: String(req.params.roomId || "").toLowerCase() });
    if (!meeting) return res.status(404).json({ success: false, error: "Meeting not found" });
    if (String(meeting.host) !== String(req.user._id)) return res.status(403).json({ success: false, error: "Only the host can remove participants" });
    const userId = String(req.body?.userId || "");
    if (!userId) return res.status(400).json({ success: false, error: "Participant is required" });
    if (!meeting.removedUsers.some((u) => String(u) === userId)) meeting.removedUsers.push(userId);
    await meeting.save();
    const io = req.app.get("io");
    if (io) {
      const members = await io.in("meeting:" + meeting.roomId).fetchSockets();
      const guest = members.find((s) => s.data && String(s.data.meetingUserId) === userId);
      if (guest) {
        guest.emit("meeting\:removed", { roomId: meeting.roomId });
        io.to("meeting:" + meeting.roomId).emit("meeting\:peer-left", { peerId: guest.id });
      }
    }
    return res.json({ success: true });
  } catch (error) {
    console.error("[MEETING_REMOVE]", error);
    return res.status(500).json({ success: false, error: "Unable to remove participant" });
  }
});

module.exports = router;
