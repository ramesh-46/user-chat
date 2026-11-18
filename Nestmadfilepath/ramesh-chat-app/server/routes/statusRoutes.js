const router = require("express").Router();
const mongoose = require("mongoose");
const multer = require("multer");
const User = require("../models/User");
const Status = require("../models/Status");
const Message = require("../models/Message");
const admin = require("../config/firebaseAdmin");
const { uploadMedia, createMediaUrl } = require("../services/mediaStorage");

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => cb(null, /^(image|video)\//.test(file.mimetype)),
});

async function signedIn(req, res, next) {
  try {
    const header = String(req.headers.authorization || "");
    if (!header.startsWith("Bearer ")) return res.status(401).json({ error: "Sign in required." });
    const decoded = await admin.auth().verifyIdToken(header.slice(7));
    const user = await User.findOne({ firebaseUid: decoded.uid }).select("_id username name avatar blockList").lean();
    if (!user) return res.status(401).json({ error: "Account not found." });
    req.statusUser = user;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Your session is invalid. Please sign in again." });
  }
}
router.use(signedIn);

function canSee(status, viewerId) {
  const owner = String(status.owner?._id || status.owner);
  const viewer = String(viewerId);
  if (owner === viewer) return true;
  if (status.privacy === "only") return (status.allowedUsers || []).some(x => String(x) === viewer);
  if (status.privacy === "except" && (status.excludedUsers || []).some(x => String(x) === viewer)) return false;
  return true;
}
async function withMedia(status) {
  const item = status.toObject ? status.toObject() : status;
  if (item.mediaPath) item.mediaUrl = await createMediaUrl(item.mediaPath, 300);
  item.viewerCount = (item.viewers || []).length;
  return item;
}

router.get("/", async (req, res) => {
  try {
    const me = req.statusUser._id;
    const user = await User.findById(me).select("blockList").lean();
    const blocked = (user?.blockList || []).map(String);
    const rows = await Status.find({ expiresAt: { $gt: new Date() }, owner: { $nin: [me, ...blocked] } })
      .populate("owner", "name username avatar blockList").sort({ createdAt: 1 }).lean();
    const contactIds = await Message.distinct("sender", { receiver: me });
    const sentToIds = await Message.distinct("receiver", { sender: me });
    const contacts = new Set([...contactIds, ...sentToIds].map(String));
    const visible = rows.filter(row => canSee(row, me) && contacts.has(String(row.owner?._id)) && !blocked.includes(String(row.owner?._id)) && !(row.owner?.blockList || []).some(id => String(id) === String(me)));
    const own = await Status.find({ owner: me, expiresAt: { $gt: new Date() } }).sort({ createdAt: 1 }).lean();
    const grouped = new Map();
    for (const row of visible) {
      const id = String(row.owner._id);
      if (!grouped.has(id)) grouped.set(id, { owner: row.owner, statuses: [] });
      grouped.get(id).statuses.push(await withMedia(row));
    }
    return res.json({ success: true, mine: await Promise.all(own.map(withMedia)), contacts: [...grouped.values()] });
  } catch (error) {
    console.error("[STATUS_LIST]", error);
    return res.status(500).json({ error: "Unable to load statuses." });
  }
});

router.post("/", upload.single("media"), async (req, res) => {
  try {
    const { type, text = "", caption = "", background = "#8065F5", privacy = "contacts", excludedUsers = "[]", allowedUsers = "[]" } = req.body;
    if (!["image", "video", "text"].includes(type)) return res.status(400).json({ error: "Choose an image, video or text status." });
    if (type === "text" && !String(text).trim()) return res.status(400).json({ error: "Write something before posting." });
    if (type !== "text" && !req.file) return res.status(400).json({ error: "Select a media file." });
    if (type === "image" && !req.file?.mimetype.startsWith("image/")) return res.status(400).json({ error: "Choose an image." });
    if (type === "video" && !req.file?.mimetype.startsWith("video/")) return res.status(400).json({ error: "Choose a video." });
    if (!["contacts", "except", "only"].includes(privacy)) return res.status(400).json({ error: "Invalid privacy setting." });
    const parseIds = value => {
      const ids = JSON.parse(value);
      if (!Array.isArray(ids) || ids.length > 500 || ids.some(id => !mongoose.Types.ObjectId.isValid(id))) throw new Error("Invalid privacy contacts.");
      return ids;
    };
    const excluded = parseIds(excludedUsers);
    const allowed = parseIds(allowedUsers);
    const uploaded = req.file ? await uploadMedia(req.file, `statuses/${req.statusUser._id}`) : null;
    const status = await Status.create({
      owner: req.statusUser._id, type, text: String(text).slice(0, 700),
      caption: String(caption).slice(0, 300), background: /^#[0-9a-f]{6}$/i.test(background) ? background : "#8065F5",
      privacy, excludedUsers: excluded, allowedUsers: allowed,
      mediaPath: uploaded?.path || "", mime: uploaded?.mime || "",
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    });
    return res.status(201).json({ success: true, status: await withMedia(status) });
  } catch (error) {
    if (error instanceof multer.MulterError) return res.status(413).json({ error: "Media must be 100 MB or smaller." });
    console.error("[STATUS_CREATE]", error);
    return res.status(400).json({ error: error.message || "Unable to post status." });
  }
});

router.post("/:id/view", async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(404).json({ error: "Status not found." });
    const status = await Status.findOne({ _id: req.params.id, expiresAt: { $gt: new Date() } });
    if (!status || !canSee(status, req.statusUser._id)) return res.status(404).json({ error: "Status not found." });
    if (String(status.owner) === String(req.statusUser._id)) return res.json({ success: true });
    await Status.updateOne({ _id: status._id, "viewers.user": { $ne: req.statusUser._id } }, { $push: { viewers: { user: req.statusUser._id, viewedAt: new Date() } } });
    return res.json({ success: true });
  } catch (error) { return res.status(500).json({ error: "Unable to record status view." }); }
});

router.get("/:id/viewers", async (req, res) => {
  try {
    const status = await Status.findOne({ _id: req.params.id, owner: req.statusUser._id, expiresAt: { $gt: new Date() } })
      .populate("viewers.user", "name username avatar").lean();
    if (!status) return res.status(404).json({ error: "Status not found." });
    return res.json({ success: true, viewers: (status.viewers || []).map(v => ({ user: v.user, viewedAt: v.viewedAt })) });
  } catch (error) { return res.status(500).json({ error: "Unable to load viewers." }); }
});

router.delete("/:id", async (req, res) => {
  try {
    const deleted = await Status.findOneAndDelete({ _id: req.params.id, owner: req.statusUser._id });
    if (!deleted) return res.status(404).json({ error: "Status not found." });
    return res.json({ success: true });
  } catch (error) { return res.status(500).json({ error: "Unable to delete status." }); }
});

module.exports = router;
