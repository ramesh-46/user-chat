const router = require("express").Router();
const firebaseAuth = require("../middleware/firebaseAuth");
const User = require("../models/User");

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
module.exports = router;
