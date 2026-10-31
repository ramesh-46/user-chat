const express = require("express");
const mongoose = require("mongoose");
const Group = require("../models/Group");
const User = require("../models/User");
const Message = require("../models/Message");
const firebaseAuth = require("../middleware/firebaseAuth");

const router = express.Router();
router.use(firebaseAuth);

const isId = (value) => mongoose.Types.ObjectId.isValid(value);
const adminsOf = (group) => {
  const ids = [...(group.admins || []).map(String)];
  if (group.admin && !ids.includes(String(group.admin))) ids.push(String(group.admin));
  return ids;
};
const isAdmin = (group, userId) => adminsOf(group).includes(String(userId));

async function loadGroup(groupId) {
  if (!isId(groupId)) return null;
  return Group.findById(groupId);
}

// Create a group. The authenticated user is always the creator/admin.
router.post("/create", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const requestedMembers = Array.isArray(req.body.memberIds) ? req.body.memberIds : [];
    if (!name || name.length > 100) {
      return res.status(400).json({ success: false, error: "Group name must be 1–100 characters" });
    }

    const memberIds = [...new Set(requestedMembers.map(String))];
    if (memberIds.some((id) => !isId(id))) {
      return res.status(400).json({ success: false, error: "One or more member IDs are invalid" });
    }

    const existingUsers = await User.find({ _id: { $in: memberIds } }).select("_id");
    if (existingUsers.length !== memberIds.length) {
      return res.status(400).json({ success: false, error: "One or more members do not exist" });
    }

    const group = await Group.create({
      name,
      admin: req.user._id,
      admins: [req.user._id],
      members: [...new Set([String(req.user._id), ...memberIds])],
      description: String(req.body.description || "").trim().slice(0, 500),
      avatar: String(req.body.avatar || "").trim(),
    });
    return res.status(201).json({ success: true, group });
  } catch (error) {
    console.error("[GROUP_CREATE]", error);
    return res.status(500).json({ success: false, error: "Unable to create group" });
  }
});

// List groups for the authenticated user only.
router.get("/", async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("admin", "username name avatar")
      .populate("admins", "username name avatar")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
    return res.json(groups);
  } catch (error) {
    console.error("[GROUP_LIST]", error);
    return res.status(500).json({ success: false, error: "Unable to fetch groups" });
  }
});

// Backward-compatible URL shape, but a caller cannot request another user's groups.
router.get("/:userId", async (req, res, next) => {
  if (req.params.userId !== String(req.user._id)) {
    return res.status(403).json({ success: false, error: "You can only view your own groups" });
  }
  return next();
}, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate("admin", "username name avatar")
      .populate("admins", "username name avatar")
      .sort({ updatedAt: -1, createdAt: -1 })
      .lean();
    return res.json(groups.map((g) => ({
      ...g,
      adminName: g.admin?.username || g.admin?.name || "",
      admin: g.admin?._id || g.admin,
    })));
  } catch (error) {
    console.error("[GROUP_LIST_LEGACY]", error);
    return res.status(500).json({ success: false, error: "Unable to fetch groups" });
  }
});

// Add a member (admin only).
router.post("/add", async (req, res) => {
  try {
    const { groupId, newUserId } = req.body;
    if (!isId(newUserId)) return res.status(400).json({ success: false, error: "Invalid member ID" });
    const group = await loadGroup(groupId);
    if (!group) return res.status(404).json({ success: false, error: "Group not found" });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, error: "Only group admins can add members" });
    const user = await User.findById(newUserId).select("_id");
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    if (!group.members.some((id) => String(id) === String(newUserId))) group.members.push(newUserId);
    await group.save();
    return res.json({ success: true, group });
  } catch (error) {
    console.error("[GROUP_ADD_MEMBER]", error);
    return res.status(500).json({ success: false, error: "Unable to add member" });
  }
});

// Remove a member (admin only). Prevent removing the final admin.
router.post("/remove", async (req, res) => {
  try {
    const { groupId, removeUserId } = req.body;
    if (!isId(removeUserId)) return res.status(400).json({ success: false, error: "Invalid member ID" });
    const group = await loadGroup(groupId);
    if (!group) return res.status(404).json({ success: false, error: "Group not found" });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, error: "Only group admins can remove members" });
    if (!group.members.some((id) => String(id) === String(removeUserId))) {
      return res.status(404).json({ success: false, error: "User is not a group member" });
    }
    const admins = adminsOf(group);
    if (admins.includes(String(removeUserId)) && admins.length === 1) {
      return res.status(400).json({ success: false, error: "Promote another admin before removing the last admin" });
    }
    group.members = group.members.filter((id) => String(id) !== String(removeUserId));
    group.admins = admins.filter((id) => id !== String(removeUserId));
    if (String(group.admin) === String(removeUserId)) group.admin = group.admins[0];
    await group.save();
    return res.json({ success: true, group });
  } catch (error) {
    console.error("[GROUP_REMOVE_MEMBER]", error);
    return res.status(500).json({ success: false, error: "Unable to remove member" });
  }
});

// Promote a current member to admin.
router.post("/admins/add", async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await loadGroup(groupId);
    if (!group) return res.status(404).json({ success: false, error: "Group not found" });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, error: "Only group admins can promote admins" });
    if (!group.members.some((id) => String(id) === String(userId))) return res.status(400).json({ success: false, error: "User must be a group member first" });
    const admins = adminsOf(group);
    if (!admins.includes(String(userId))) group.admins.push(userId);
    await group.save();
    return res.json({ success: true, group });
  } catch (error) {
    console.error("[GROUP_PROMOTE_ADMIN]", error);
    return res.status(500).json({ success: false, error: "Unable to promote admin" });
  }
});

// Demote an admin, never leaving a group without an admin.
router.post("/admins/remove", async (req, res) => {
  try {
    const { groupId, userId } = req.body;
    const group = await loadGroup(groupId);
    if (!group) return res.status(404).json({ success: false, error: "Group not found" });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, error: "Only group admins can demote admins" });
    const admins = adminsOf(group);
    if (!admins.includes(String(userId))) return res.status(400).json({ success: false, error: "User is not an admin" });
    if (admins.length <= 1) return res.status(400).json({ success: false, error: "A group must have at least one admin" });
    group.admins = admins.filter((id) => id !== String(userId));
    if (String(group.admin) === String(userId)) group.admin = group.admins[0];
    await group.save();
    return res.json({ success: true, group });
  } catch (error) {
    console.error("[GROUP_DEMOTE_ADMIN]", error);
    return res.status(500).json({ success: false, error: "Unable to demote admin" });
  }
});

// Update group name/description/avatar (admin only).
router.patch("/:groupId", async (req, res) => {
  try {
    const group = await loadGroup(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, error: "Group not found" });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, error: "Only group admins can edit group details" });
    if (req.body.name !== undefined) {
      const name = String(req.body.name).trim();
      if (!name || name.length > 100) return res.status(400).json({ success: false, error: "Invalid group name" });
      group.name = name;
    }
    if (req.body.description !== undefined) group.description = String(req.body.description).trim().slice(0, 500);
    if (req.body.avatar !== undefined) group.avatar = String(req.body.avatar).trim();
    await group.save();
    return res.json({ success: true, group });
  } catch (error) {
    console.error("[GROUP_UPDATE]", error);
    return res.status(500).json({ success: false, error: "Unable to update group" });
  }
});

// Delete group (admin only).
router.delete("/:groupId", async (req, res) => {
  try {
    const group = await loadGroup(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, error: "Group not found" });
    if (!isAdmin(group, req.user._id)) return res.status(403).json({ success: false, error: "Only group admins can delete this group" });
    await Message.deleteMany({ groupId: group._id });
    await Group.deleteOne({ _id: group._id });
    req.app.get("io")?.to("group:" + String(group._id)).emit("group:deleted", { groupId: String(group._id) });
    return res.json({ success: true, message: "Group deleted" });
  } catch (error) {
    console.error("[GROUP_DELETE]", error);
    return res.status(500).json({ success: false, error: "Unable to delete group" });
  }
});

// Member leaves. Last admin must promote someone before leaving.
router.post("/:groupId/leave", async (req, res) => {
  try {
    const group = await loadGroup(req.params.groupId);
    if (!group) return res.status(404).json({ success: false, error: "Group not found" });
    const userId = String(req.user._id);
    if (!group.members.some((id) => String(id) === userId)) return res.status(400).json({ success: false, error: "You are not a group member" });
    const admins = adminsOf(group);
    if (admins.includes(userId) && admins.length === 1) return res.status(400).json({ success: false, error: "Promote another admin before leaving" });
    group.members = group.members.filter((id) => String(id) !== userId);
    group.admins = admins.filter((id) => id !== userId);
    if (String(group.admin) === userId) group.admin = group.admins[0];
    await group.save();
    return res.json({ success: true, message: "You left the group" });
  } catch (error) {
    console.error("[GROUP_LEAVE]", error);
    return res.status(500).json({ success: false, error: "Unable to leave group" });
  }
});

module.exports = router;
