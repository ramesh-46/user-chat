const { Schema, model } = require("mongoose");

// Google Meet-style meeting record: shareable code (xxx-yyyy-zzz), optional
// passcode, waiting room, host lock and participant removal support.
const meetingSchema = new Schema({
  roomId: { type: String, required: true, unique: true, index: true },   // internal 32-hex WebRTC room id
  code: { type: String, required: true, unique: true, index: true },     // public xxx-yyyy-zzz code
  title: { type: String, default: "Sura Chat meeting", maxlength: 120 },
  host: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  hasPasscode: { type: Boolean, default: false },
  passcodeHash: { type: String, default: null, select: false },
  waitingRoom: { type: Boolean, default: true },                          // host must admit participants
  locked: { type: Boolean, default: false },                              // host locked the room
  status: { type: String, enum: ["live", "ended"], default: "live" },
  scheduledAt: { type: Date, default: null },
  startedAt: { type: Date, default: null },
  endedAt: { type: Date, default: null },
  removedUsers: { type: [Schema.Types.ObjectId], default: [] },           // users removed by the host
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true, versionKey: false });

module.exports = model("Meeting", meetingSchema);
