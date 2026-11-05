const router = require("express").Router();
const firebaseAuth = require("../middleware/firebaseAuth");
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
