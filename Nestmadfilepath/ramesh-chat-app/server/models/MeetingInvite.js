const { Schema, model } = require("mongoose");

// A meeting invitation sent from a host to a Sura Chat contact.
const inviteSchema = new Schema({
  meeting: { type: Schema.Types.ObjectId, ref: "Meeting", required: true },
  roomId: { type: String, required: true, index: true },
  code: { type: String, required: true },
  title: { type: String, default: "Sura Chat meeting" },
  from: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  to: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  status: { type: String, enum: ["pending", "accepted", "declined", "expired"], default: "pending" },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true, versionKey: false });

inviteSchema.index({ to: 1, status: 1 });

module.exports = model("MeetingInvite", inviteSchema);
