// const router = require("express").Router();
// const User   = require("../models/User");

// const admin = require("../config/firebaseAdmin");

// router.post("/signup", async (req,res)=>{
//   const { idToken } = req.body;
//   const decoded = await admin.auth().verifyIdToken(idToken);
//   const phone   = decoded.phone_number;               // "+911234567890"
//   let user = await User.findOne({ mobile:phone });
//   if(!user) user = await User.create({ mobile:phone });
//   res.json(user);                                     // send chat‑JWT here
// });


// router.post("/login", async (req, res) => {
//   try {
//     const { mobile, password } = req.body;
//     const user = await User.findOne({ mobile });
//     if (!user || !(await user.compare(password)))
//       return res.status(400).json({ success: false, error: "Invalid creds" });
//     res.json({ success: true, userId: user._id });
//   } catch (e) {
//     res.status(500).json({ success: false, error: e.message });
//   }
// });

// module.exports = router;// server/routes/authRoutes.js

const express = require("express");
const admin   = require("../config/firebaseAdmin");
const User    = require("../models/User");
const router  = express.Router();

const DeletedAccount = require("../models/DeletedAccount");

/* helper – safe verify */
const verifyId = async (token) => {
  try { return await admin.auth().verifyIdToken(token); }
  catch { return null; }
};
const bcrypt = require("bcrypt");

/* ---------- SIGN‑UP ----------  { idToken, username, password } */

// ---------- SIGN‑UP ----------  { idToken, username, password }

router.post("/signup", async (req, res) => {
  try {
    const { idToken, username, password } = req.body;
    if (!idToken || !username || !password)
      return res.status(400).json({ error: "Missing data" });

    const decoded = await verifyId(idToken);
    if (!decoded) return res.status(401).json({ error: "Bad token" });

    const uname = username.trim().toLowerCase();
    if (await User.findOne({ username: uname }))
      return res.status(409).json({ error: "Username taken" });

    const user = await User.create({
      firebaseUid: decoded.uid,
      email: decoded.email,
      name: decoded.name || "",
      username: uname,
      password: password.trim(), // ✅ Store password directly (for now only)
    });

    res.json(user);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

// router.post("/delete-account", async (req, res) => {
//   try {
//     const { userId } = req.body;
//     if (!userId) return res.status(400).json({ error: "Missing userId" });

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ error: "User not found" });

//     const alreadyScheduled = await DeletedAccount.findOne({ userId });
//     if (alreadyScheduled) {
//       return res.status(400).json({ error: "Already scheduled for deletion" });
//     }

//     await DeletedAccount.create({
//       userId,
//       username: user.username,
//       deletedAt: new Date(),
//       deleteAfterMs: 2 * 24 * 60 * 60 * 1000, // 2 days
//     });

//     res.json({
//   message: "Account deletion scheduled in 2 days",
//   deletedAt: new Date(),
//   deleteAfterMs: 2 * 24 * 60 * 60 * 1000,
// });

//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

// GET deletion info for a user
// router.get("/deleted/:username", async (req, res) => {
//   try {
//     const { username } = req.params;
//     const info = await DeletedAccount.findOne({ username });
//     if (!info) return res.status(404).json({ error: "No deletion info" });
//     res.json(info);
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ error: "Server error" });
//   }
// });

/* ---------- LOGIN ----------  { username, password } */
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: "Missing credentials" });

    /* 1. find email by username */
    const userDoc = await User.findOne({ username: username.toLowerCase() });
    if (!userDoc) return res.status(404).json({ error: "User not found" });

    /* 2. sign‑in with Firebase email/password */
    const { email } = userDoc;
    const fbUser = await admin.auth().getUserByEmail(email); // test email exists
    // we can’t verify password on server; just trust client Firebase login
    res.json(userDoc);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: "Server error" });
  }
});

/* ---------- Recovery helpers ---------- */
/* GET /api/auth/recover/username?email=foo@bar.com   -> returns { username } */
router.get("/recover/username", async (req, res) => {
  const user = await User.findOne({ email: req.query.email });
  if (!user) return res.status(404).json({ error: "No user" });
  res.json({ username: user.username });
});

/* GET /api/auth/recover/email?username=john -> returns { email } */
router.get("/recover/email", async (req, res) => {
  const user = await User.findOne({ username: req.query.username.toLowerCase() });
  if (!user) return res.status(404).json({ error: "No user" });
  res.json({ email: user.email });
});
// Example (Node.js + Express)
// GET /api/auth/recover/password?email=someone@example.com&answer=TEACHERNAME

// ✅ Recover password using security answer// GET /api/auth/recover/question?email=foo@bar.com&answer=MyTeacher

router.get("/recover/question", async (req, res) => {
  const { email, answer } = req.query;

  if (!email || !answer)
    return res.status(400).json({ error: "Missing fields" });

  const user = await User.findOne({ email });
  if (!user) return res.status(404).json({ error: "Not found" });

  const dbAnswer = (user.recoveryAnswer || "").trim().toUpperCase();
  const userAnswer = answer.trim().toUpperCase();

  if (dbAnswer !== userAnswer)
    return res.status(403).json({ error: "Wrong answer" });

  // ✅ Return actual password if stored
  if (!user.password) {
    return res.json({ password: "No password stored." });
  }

  return res.json({ password: user.password });
});


module.exports = router;
