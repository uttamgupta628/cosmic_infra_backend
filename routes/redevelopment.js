const express = require("express");
const router = express.Router();
const Redevelopment = require("../models/Redevelopment");
const { protect } = require("../middleware/auth");

// POST /api/redevelopment  (PUBLIC - "Apply for Redevelopment" form)
router.post("/", async (req, res, next) => {
  try {
    const { name, phone, email, propertyAddress, message } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }
    const application = await Redevelopment.create({ name, phone, email, propertyAddress, message });
    res.status(201).json({ message: "Application received. Our team will contact you.", application });
  } catch (err) {
    next(err);
  }
});

// GET /api/redevelopment  (ADMIN)
router.get("/", protect, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    const applications = await Redevelopment.find(filter).sort({ createdAt: -1 });
    res.json(applications);
  } catch (err) {
    next(err);
  }
});

// PUT /api/redevelopment/:id  (ADMIN)
router.put("/:id", protect, async (req, res, next) => {
  try {
    const application = await Redevelopment.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.json(application);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/redevelopment/:id  (ADMIN)
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const application = await Redevelopment.findByIdAndDelete(req.params.id);
    if (!application) return res.status(404).json({ message: "Application not found" });
    res.json({ message: "Application deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
