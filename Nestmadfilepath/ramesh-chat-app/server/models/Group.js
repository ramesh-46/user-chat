// server/models/Group.js
const mongoose = require("mongoose");

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 1,
      maxlength: 100,
    },
    // Kept for backward compatibility with existing client code and records.
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Supports multiple admins. Existing groups are migrated lazily by routes.
    admins: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: "User" }],
    description: { type: String, trim: true, maxlength: 500, default: "" },
    avatar: { type: String, default: "" },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
  },
  { versionKey: false }
);

groupSchema.pre("save", function (next) {
  if (!this.admins || this.admins.length === 0) {
    this.admins = this.admin ? [this.admin] : [];
  }
  if (this.admin && !this.admins.some((id) => id.toString() === this.admin.toString())) {
    this.admins.push(this.admin);
  }
  this.updatedAt = new Date();
  next();
});

groupSchema.index({ members: 1, updatedAt: -1 });
groupSchema.index({ admins: 1 });

module.exports = mongoose.model("Group", groupSchema);
