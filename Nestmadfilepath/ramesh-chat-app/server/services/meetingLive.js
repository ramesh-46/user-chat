// Google Meet-style live meeting helpers: waiting room (lobby), host
// admit/deny, lock, end-for-all, remove, raise hand, reactions and in-meeting
// chat. Installed once per socket connection from server.js.
const admin = require("../config/firebaseAdmin");
const User = require("../models/User");
const Meeting = require("../models/Meeting");

const ROOM_RE = /^[a-f0-9]{24,64}$/i;
const REACTIONS = ["👍", "👏", "❤️", "😂", "🎉", "😮"];

async function verifyHost(roomId, token) {
  if (!ROOM_RE.test(String(roomId || "")) || !token) return null;
  const decoded = await admin.auth().verifyIdToken(token);
  const host = await User.findOne({ firebaseUid: decoded.uid }).select("_id").lean();
  if (!host) return null;
  const meeting = await Meeting.findOne({ roomId: String(roomId).toLowerCase() }).lean();
  if (!meeting || String(meeting.host) !== String(host._id)) return null;
  return { meeting, hostId: String(host._id) };
}

module.exports = function registerMeetingLive(io, socket) {

  // Participant asks to join a waiting-room meeting; the host is notified.
  socket.on("meeting:knock", async ({ roomId, token, name } = {}) => {
    try {
      const code = String(roomId || "").toLowerCase();
      if (!ROOM_RE.test(code) || !token) return;
      const decoded = await admin.auth().verifyIdToken(token);
      const member = await User.findOne({ firebaseUid: decoded.uid }).select("_id name username").lean();
      if (!member) return;
      const meeting = await Meeting.findOne({ roomId: code, status: "live", expiresAt: { $gt: new Date() } }).lean();
      if (!meeting) return socket.emit("meeting:denied", { roomId: code, reason: "This meeting has ended or does not exist." });
      if (meeting.locked && String(meeting.host) !== String(member._id)) {
        return socket.emit("meeting:denied", { roomId: code, reason: "The host has locked this meeting." });
      }
      socket.join("meeting-wait:" + code);
      socket.data.waitRoom = "meeting-wait:" + code;
      socket.data.waitName = String(name || member.name || member.username || "Participant").slice(0, 60);
      socket.data.waitUserId = String(member._id);
      io.to(String(meeting.host)).emit("meeting:knock", {
        roomId: code, socketId: socket.id, name: socket.data.waitName, userId: String(member._id)
      });
    } catch (_) { /* ignore malformed knocks */ }
  });

  // Host admits or denies a waiting participant.
  socket.on("meeting:respond", async ({ roomId, target, allow, token } = {}) => {
    try {
      const check = await verifyHost(roomId, token);
      if (!check || !target) return;
      const waiting = await io.in("meeting-wait:" + String(roomId).toLowerCase()).fetchSockets();
      const guest = waiting.find((s) => s.id === String(target));
      if (!guest) return;
      if (allow) {
        guest.emit("meeting:admitted", { roomId: String(roomId).toLowerCase() });
      } else {
        guest.emit("meeting:denied", { roomId: String(roomId).toLowerCase(), reason: "The host denied your request to join." });
        guest.leave("meeting-wait:" + String(roomId).toLowerCase());
        guest.data.waitRoom = null;
      }
    } catch (_) { /* ignore */ }
  });

  // Host locks/unlocks the room so no new participants can join.
  socket.on("meeting:lock", async ({ roomId, locked, token } = {}) => {
    try {
      const check = await verifyHost(roomId, token);
      if (!check) return;
      await Meeting.updateOne({ roomId: String(roomId).toLowerCase() }, { locked: !!locked });
      io.to("meeting:" + String(roomId).toLowerCase()).emit("meeting:locked", { roomId: String(roomId).toLowerCase(), locked: !!locked });
    } catch (_) { /* ignore */ }
  });

  // Host ends the meeting for everyone, including the waiting room.
  socket.on("meeting:end", async ({ roomId, token } = {}) => {
    try {
      const check = await verifyHost(roomId, token);
      if (!check) return;
      const code = String(roomId).toLowerCase();
      await Meeting.updateOne({ roomId: code }, { status: "ended", endedAt: new Date() });
      io.to("meeting:" + code).emit("meeting:ended", { roomId: code });
      io.to("meeting-wait:" + code).emit("meeting:ended", { roomId: code });
    } catch (_) { /* ignore */ }
  });

  // Host removes a participant from the live room and blocks them from rejoining.
  socket.on("meeting:remove", async ({ roomId, target, token } = {}) => {
    try {
      const check = await verifyHost(roomId, token);
      if (!check || !target) return;
      const code = String(roomId).toLowerCase();
      const members = await io.in("meeting:" + code).fetchSockets();
      const guest = members.find((s) => s.id === String(target));
      if (guest) {
        const removedId = guest.data && guest.data.meetingUserId;
        if (removedId) {
          await Meeting.updateOne({ roomId: code }, { $addToSet: { removedUsers: removedId } });
        }
        guest.emit("meeting:removed", { roomId: code });
        io.to("meeting:" + code).emit("meeting:peer-left", { peerId: String(target) });
      }
    } catch (_) { /* ignore */ }
  });

  // Raise / lower hand, visible to everyone in the room.
  socket.on("meeting:hand", ({ roomId, raised } = {}) => {
    const room = "meeting:" + String(roomId || "").toLowerCase();
    if (socket.data.meetingRoom !== room) return;
    socket.to(room).emit("meeting:hand", { peerId: socket.id, name: socket.data.meetingName, raised: !!raised });
  });

  // Emoji reactions floating over the meeting.
  socket.on("meeting:reaction", ({ roomId, emoji } = {}) => {
    const room = "meeting:" + String(roomId || "").toLowerCase();
    if (socket.data.meetingRoom !== room) return;
    const clean = String(emoji || "").slice(0, 8);
    if (!REACTIONS.includes(clean)) return;
    io.to(room).emit("meeting:reaction", { peerId: socket.id, name: socket.data.meetingName, emoji: clean });
  });

  // Lightweight in-meeting chat.
  socket.on("meeting:chat", ({ roomId, text } = {}) => {
    const room = "meeting:" + String(roomId || "").toLowerCase();
    if (socket.data.meetingRoom !== room) return;
    const clean = String(text || "").trim().slice(0, 500);
    if (!clean) return;
    io.to(room).emit("meeting:chat", {
      peerId: socket.id, name: socket.data.meetingName, text: clean, at: new Date().toISOString()
    });
  });

  // Clear waiting-room state when the socket goes away.
  const clearWait = () => { socket.data.waitRoom = null; socket.data.waitName = null; socket.data.waitUserId = null; };
  socket.on("meeting:knock-cancel", ({ roomId } = {}) => {
    const room = "meeting-wait:" + String(roomId || "").toLowerCase();
    if (socket.data.waitRoom !== room) return;
    socket.leave(room);
    clearWait();
  });
  socket.on("disconnect", clearWait);
};
