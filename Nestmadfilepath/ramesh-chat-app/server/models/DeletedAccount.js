const { Schema, model } = require("mongoose");

const deletedAccountSchema = new Schema(
  {
    firebaseUid: String,
    email:       String,
    username:    String,
    name:        String,
    mobile:      String,
    about:       String,
    avatar:      String,
    password:    String,
    recoveryAnswer: String,

    deletedAt: { type: Date, default: Date.now },
    deleteAfterMs: { type: Number, default: 172800000 }, // 2 days
  },
  { timestamps: true, versionKey: false }
);

module.exports = model("DeletedAccount", deletedAccountSchema);
