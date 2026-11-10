const { Schema, model } = require("mongoose");

const userSchema = new Schema(
  {
    firebaseUid: { type: String, required: true, unique: true },
    email: { type: String, required: true },
    username: { type: String, required: true, unique: true },
    name: { type: String },
    mobile: { type: String, unique: true, sparse: true },
    about: { type: String },
    avatar: { type: String },
    fcmToken: { type: String },
    fcmTokens: { type: [String], default: [] },
    password: { type: String },
    recoveryAnswer: { type: String },
    blockList: [{ type: Schema.Types.ObjectId, ref: "User" }],
    online: { type: Boolean, default: false },
    lastSeen: { type: Date, default: null },
    themePreferences: {
      themeKey: { type: String, enum: ["blackPearl", "midnight"], default: "blackPearl" },
      customColor: { type: String, default: "" },
    },
  },
  { timestamps: true, versionKey: false }
);

module.exports = model("User", userSchema);
