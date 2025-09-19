// const { Schema, model } = require("mongoose");
// const bcrypt = require("bcryptjs");

// const UserSchema = new Schema({
//   mobile:   { type: String, unique: true, required: true },
//   password: { type: String, required: true }
// });

// UserSchema.pre("save", async function (next) {
//   if (!this.isModified("password")) return next();
//   this.password = await bcrypt.hash(this.password, 10);
//   next();
// });

// UserSchema.methods.compare = function (pwd) {
//   return bcrypt.compare(pwd, this.password);
// };

// module.exports = model("User", UserSchema);

// server/models/User.js

// const { Schema, model } = require("mongoose");
// const userSchema = new Schema(
//   {
//     firebaseUid: { type: String, required: true, unique: true },
//     email:       { type: String, required: true },
//     username:    { type: String, required: true, unique: true },
//     name:        { type: String },
//     mobile:      { type: String, unique: true, sparse: true },
//     about:       { type: String },
//     avatar:      { type: String },
//     fcmToken:    { type: String },
// password: { type: String },

//     // ✅ Add this:
//     recoveryAnswer: { type: String }
//   },
//   { timestamps: true, versionKey: false }
// );


// module.exports = model("User", userSchema);


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
    password: { type: String },
    recoveryAnswer: { type: String },
    blockList: [{ type: Schema.Types.ObjectId, ref: "User" }], // Add block list
  },
  { timestamps: true, versionKey: false }
);

module.exports = model("User", userSchema);
