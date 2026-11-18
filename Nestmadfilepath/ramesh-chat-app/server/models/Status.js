const { Schema, model } = require("mongoose");

const statusSchema = new Schema({
  owner: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type: { type: String, enum: ["image", "video", "text"], required: true },
  text: { type: String, maxlength: 700, default: "" },
  background: { type: String, default: "#8065F5" },
  mediaPath: { type: String, default: "" },
  mime: { type: String, default: "" },
  caption: { type: String, maxlength: 300, default: "" },
  privacy: { type: String, enum: ["contacts", "except", "only"], default: "contacts" },
  excludedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  allowedUsers: [{ type: Schema.Types.ObjectId, ref: "User" }],
  viewers: [{ user: { type: Schema.Types.ObjectId, ref: "User" }, viewedAt: { type: Date, default: Date.now } }],
  expiresAt: { type: Date, required: true, index: { expireAfterSeconds: 0 } },
}, { timestamps: true, versionKey: false });

statusSchema.index({ owner: 1, createdAt: -1 });
module.exports = model("Status", statusSchema);
