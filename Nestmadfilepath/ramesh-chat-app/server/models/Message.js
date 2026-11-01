const { Schema, model } = require("mongoose");

const messageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", default: null, index: true },
    groupId: { type: Schema.Types.ObjectId, ref: "Group", default: null, index: true },
    text: { type: String, maxlength: 10000 },
    file: String,
    fileType: String,
    mime: String,
    content: Schema.Types.Mixed,
    starred: { type: Boolean, default: false },
    deletedFor: [{ type: Schema.Types.ObjectId, ref: "User" }],
    deletedForEveryone: { type: Boolean, default: false },
    deletedAt: Date,
    viewOnce: { type: Boolean, default: false },
    openedBy: [{ type: Schema.Types.ObjectId, ref: "User" }],
    readBy: [{ type: Schema.Types.ObjectId, ref: "User", index: true }],
    createdAt: { type: Date, default: Date.now, index: true }
  },
  { versionKey: false }
);

messageSchema.index({ groupId: 1, createdAt: 1 });
messageSchema.index({ sender: 1, receiver: 1, createdAt: 1 });

module.exports = model("Message", messageSchema);
