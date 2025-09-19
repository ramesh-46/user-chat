const router = require("express").Router();
const User   = require("../models/User");

// save / refresh FCM token
router.post("/fcmtoken", async (req,res) => {
  const { userId, token } = req.body;
  await User.findByIdAndUpdate(userId, { fcmToken: token });
  res.json({ ok:true });
});

module.exports = router;
