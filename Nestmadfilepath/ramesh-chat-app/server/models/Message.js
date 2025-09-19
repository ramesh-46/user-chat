const { Schema, model } = require("mongoose");

const messageSchema = new Schema(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    text: String,
    file: String, // path in /uploads
    fileType: String, // image | video | audio | document | location | contact | poll
    mime: String, // MIME type for files
    content: Schema.Types.Mixed, // Additional content for special message types
    starred: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
  },
  { versionKey: false }
);

module.exports = model("Message", messageSchema);
