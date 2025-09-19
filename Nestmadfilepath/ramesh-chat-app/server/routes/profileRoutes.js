const router  = require("express").Router();
const User    = require("../models/User");
const upload  = require("../utils/upload");   // multer config (saves files in /uploads)

const DeletedAccount = require("../models/DeletedAccount");

/*
  PUT /api/profile/:id
  Body fields: name, mobile, about
  File field:  avatar  (optional image)

*/

router.put("/:id", upload.single("avatar"), async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobile, about, recoveryAnswer } = req.body;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (name !== undefined) user.name = name;
    if (mobile !== undefined) user.mobile = mobile;
    if (about !== undefined) user.about = about;

    // ✅ Save recoveryAnswer if provided
    if (recoveryAnswer !== undefined) {
      user.recoveryAnswer = recoveryAnswer;
    }

    // ✅ Save avatar if file uploaded
    if (req.file) {
      user.avatar = `/uploads/${req.file.filename}`;
    }

    await user.save();
    res.json(user);
  } catch (err) {
    console.error("Profile update failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});
router.post("/cancel-deletion", async (req, res) => {
  const { username } = req.body;

  try {
    const deleted = await DeletedAccount.findOne({ username });
    if (!deleted) return res.status(404).json({ error: "No deletion scheduled." });

    await DeletedAccount.deleteOne({ username });
    res.json({ message: "Deletion canceled successfully." });
  } catch (e) {
    res.status(500).json({ error: "Failed to cancel deletion." });
  }
});

router.get("/deleted/:username", async (req, res) => {
  try {
    const { username } = req.params;
    const info = await DeletedAccount.findOne({ username });
    if (!info) return res.status(404).json({ error: "No deletion info" });
    res.json(info);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});

router.post("/delete-account", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ error: "Missing userId" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const alreadyScheduled = await DeletedAccount.findOne({ userId });
    if (alreadyScheduled) {
      return res.status(400).json({ error: "Already scheduled for deletion" });
    }

    await DeletedAccount.create({
      userId,
      username: user.username,
      deletedAt: new Date(),
      deleteAfterMs: 2 * 24 * 60 * 60 * 1000, // 2 days
    });

    res.json({
  message: "Account deletion scheduled in 2 days",
  deletedAt: new Date(),
  deleteAfterMs: 2 * 24 * 60 * 60 * 1000,
});

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


module.exports = router;
