const express = require("express");
const Group = require("../models/Group");
const User = require("../models/User");
const router = express.Router();

const DeletedAccount = require("../models/DeletedAccount");

// Create group
router.post("/create", async (req, res) => {
  const { name, adminId, memberIds } = req.body;
  try {
    const group = new Group({
      name,
      admin: adminId,
      members: [adminId, ...memberIds],
    });
    await group.save();
    res.json({ success: true, group });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// Add member (admin only)
router.post("/add", async (req, res) => {
  const { groupId, adminId, newUserId } = req.body;
  const group = await Group.findById(groupId);
  if (!group) return res.status(404).send("Group not found");

  if (group.admin.toString() !== adminId)
    return res.status(403).send("Only admin can add members");

  if (!group.members.includes(newUserId)) group.members.push(newUserId);
  await group.save();
  res.json({ success: true, group });
});

// Remove member (admin only)
router.post("/remove", async (req, res) => {
  const { groupId, adminId, removeUserId } = req.body;
  const group = await Group.findById(groupId);
  if (!group) return res.status(404).send("Group not found");

  if (group.admin.toString() !== adminId)
    return res.status(403).send("Only admin can remove members");

  group.members = group.members.filter(
    (id) => id.toString() !== removeUserId
  );
  await group.save();
  res.json({ success: true, group });
});
// server/routes/groupRoutes.js


/* ── GET all groups a user belongs to ───────────── */
router.get("/:id", async (req, res) => {
  try {
    const userId = req.params.id;

    const groups = await Group.find({ members: userId })
      .populate("admin", "username")   // get admin username
      .lean();

    // Shape the data for the front‑end
    res.json(
      groups.map(g => ({
        _id:       g._id,
        name:      g.name,
        admin:     g.admin._id,
        adminName: g.admin.username,
      }))
    );
  } catch (err) {
    console.error("fetch groups failed:", err);
    res.status(500).json({ error: "Server error" });
  }
});

/* (Optional) create / add‑member / remove‑member endpoints here */

module.exports = router;
