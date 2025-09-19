// server/routes/userRoutes.js
const router = require("express").Router();
const User   = require("../models/User");
router.get("/users", async (req, res) => {
  try {
    const mobile = req.query.mobile;
    if (!mobile) return res.status(400).json({ success: false, message: "Mobile number required" });

    const user = await User.findOne({ mobile });
    res.json({ success: !!user, user });
  } catch (err) {
    console.error("Error in /users:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get("/:username", async (req,res)=>{
  const user = await User.findOne({ username:req.params.username.toLowerCase() });
  if (!user) return res.status(404).json({ error:"Not found" });
  res.json(user);
});
module.exports = router;
