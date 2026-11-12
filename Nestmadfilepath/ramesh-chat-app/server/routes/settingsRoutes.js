const router = require("express").Router();
const firebaseAuth = require("../middleware/firebaseAuth");
const User = require("../models/User");
const LoginSession = require("../models/LoginSession");
const crypto = require("crypto");

const THEMES = new Set(["blackPearl", "midnight"]);
const isHexColor = (value) => value === "" || /^#[0-9a-fA-F]{6}$/.test(value);

router.get("/preferences", firebaseAuth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("themePreferences").lean();
    return res.json({
      success: true,
      preferences: user?.themePreferences || { themeKey: "blackPearl", customColor: "" },
    });
  } catch (error) {
    console.error("[SETTINGS_GET_PREFERENCES]", error);
    return res.status(500).json({ success: false, error: "Unable to load preferences" });
  }
});

router.put("/preferences", firebaseAuth, async (req, res) => {
  try {
    const themeKey = String(req.body?.themeKey || "blackPearl");
    const customColor = String(req.body?.customColor || "");
    if (!THEMES.has(themeKey) || !isHexColor(customColor)) {
      return res.status(400).json({ success: false, error: "Invalid appearance preferences" });
    }
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { "themePreferences.themeKey": themeKey, "themePreferences.customColor": customColor } },
      { new: true, projection: { themePreferences: 1 } }
    ).lean();
    return res.json({ success: true, preferences: user?.themePreferences || { themeKey, customColor } });
  } catch (error) {
    console.error("[SETTINGS_SAVE_PREFERENCES]", error);
    return res.status(500).json({ success: false, error: "Unable to save preferences" });
  }
});

router.post("/fcmtoken", firebaseAuth, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (!token || token.length > 4096) return res.status(400).json({ success: false, error: "A valid push token is required" });
    await req.user.updateOne({ $addToSet: { fcmTokens: token } });
    return res.json({ success: true });
  } catch (error) {
    console.error("[PUSH_TOKEN_SAVE]", error);
    return res.status(500).json({ success: false, error: "Unable to save notification device" });
  }
});
router.delete("/fcmtoken", firebaseAuth, async (req, res) => {
  try {
    const token = String(req.body?.token || "").trim();
    if (token) await req.user.updateOne({ $pull: { fcmTokens: token } });
    return res.json({ success: true });
  } catch (error) {
    console.error("[PUSH_TOKEN_REMOVE]", error);
    return res.status(500).json({ success: false, error: "Unable to remove notification device" });
  }
});
router.get("/sessions", firebaseAuth, async (req, res) => {
 try { const list = await LoginSession.find({userId:req.user._id,revokedAt:null,expiresAt:{$gt:new Date()}}).select("_id deviceName browser platform lastActiveAt createdAt tokenHash").sort({lastActiveAt:-1}).lean(); const t=String(req.headers["x-device-session"]||""); const h=t?crypto.createHash("sha256").update(t).digest("hex"):""; res.json({sessions:list.map(({tokenHash,...s})=>({...s,current:!!h&&h===tokenHash}))}); } catch(e) { res.status(500).json({error:"Unable to load sessions"}); }
});
router.delete("/sessions/:id", firebaseAuth, async (req,res)=>{try{const row=await LoginSession.findOneAndUpdate({_id:req.params.id,userId:req.user._id,revokedAt:null},{$set:{revokedAt:new Date()}});if(!row)return res.status(404).json({error:"Session not found"});res.json({success:true});}catch(e){res.status(500).json({error:"Unable to revoke session"});}});
router.post("/sessions/revoke-others", firebaseAuth, async (req,res)=>{try{const t=String(req.headers["x-device-session"]||"");if(!t)return res.status(400).json({error:"Register this device by signing in again first"});const h=crypto.createHash("sha256").update(t).digest("hex");await LoginSession.updateMany({userId:req.user._id,tokenHash:{$ne:h},revokedAt:null},{$set:{revokedAt:new Date()}});res.json({success:true});}catch(e){res.status(500).json({error:"Unable to revoke sessions"});}});
module.exports = router;
