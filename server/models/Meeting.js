const { Schema, model } = require("mongoose");

const meetingSchema = new Schema({
  roomId: { type: String, required: true, unique: true, index: true },
  title: { type: String, default: "Sura Chat meeting", maxlength: 100 },
  host: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  hasPasscode: { type: Boolean, default: false },
  passcodeHash: { type: String, default: null },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
}, { timestamps: true, versionKey: false });

module.exports = model("Meeting", meetingSchema);
