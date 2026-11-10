const router = require("express").Router();
const firebaseAuth = require("../middleware/firebaseAuth");
router.get("/preferences", firebaseAuth, async (req, res) => {
  try {
    const preferences = req.user.themePreferences || {};
    return res.json({
      success: true,
      preferences: {
        themeKey: preferences.themeKey || "blackPearl",
        customColor: /^#[0-9A-Fa-f]{6}$/.test(preferences.customColor || "") ? preferences.customColor : ""
      }
    });
  } catch (error) {
    console.error("[THEME_PREFERENCES_READ]", error);
    return res.status(500).json({ success: false, error: "Unable to load appearance settings" });
  }
});
router.put("/preferences", firebaseAuth, async (req, res) => {
  try {
    const allowedThemes = ["blackPearl", "midnight"];
    const themeKey = allowedThemes.includes(req.body?.themeKey) ? req.body.themeKey : "blackPearl";
    const customColor = /^#[0-9A-Fa-f]{6}$/.test(req.body?.customColor || "") ? req.body.customColor : "";
    await req.user.updateOne({ $set: { themePreferences: { themeKey, customColor } } });
    return res.json({ success: true, preferences: { themeKey, customColor } });
  } catch (error) {
    console.error("[THEME_PREFERENCES_SAVE]", error);
    return res.status(500).json({ success: false, error: "Unable to save appearance settings" });
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
