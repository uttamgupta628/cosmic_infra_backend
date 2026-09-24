const express = require("express");
const router = express.Router();
const Admin = require("../models/Admin");
const generateToken = require("../utils/generateToken");
const { protect } = require("../middleware/auth");

// POST /api/auth/login
router.post("/login", async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }
    const admin = await Admin.findOne({ email: email.toLowerCase() });
    if (!admin || !(await admin.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }
    res.json({
      _id: admin._id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
      token: generateToken(admin._id),
    });
  } catch (err) {
    next(err);
  }
});

// GET /api/auth/me
router.get("/me", protect, async (req, res) => {
  res.json(req.admin);
});

// PUT /api/auth/change-password
router.put("/change-password", protect, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const admin = await Admin.findById(req.admin._id);
    if (!(await admin.comparePassword(currentPassword))) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }
    admin.password = newPassword;
    await admin.save();
    res.json({ message: "Password updated successfully" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
