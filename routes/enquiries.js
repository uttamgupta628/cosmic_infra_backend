const express = require("express");
const router = express.Router();
const Enquiry = require("../models/Enquiry");
const { protect } = require("../middleware/auth");

// POST /api/enquiries  (PUBLIC - submitted from the website popup / project pages)
router.post("/", async (req, res, next) => {
  try {
    const { name, phone, email, message, source, project, consent } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }
    const enquiry = await Enquiry.create({ name, phone, email, message, source, project, consent });
    res.status(201).json({ message: "Thank you! We will get back to you shortly.", enquiry });
  } catch (err) {
    next(err);
  }
});

// GET /api/enquiries  (ADMIN)
router.get("/", protect, async (req, res, next) => {
  try {
    const { status, source } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (source && source !== "all") filter.source = source;
    const enquiries = await Enquiry.find(filter).populate("project", "title").sort({ createdAt: -1 });
    res.json(enquiries);
  } catch (err) {
    next(err);
  }
});

// PUT /api/enquiries/:id  (ADMIN - update status/notes)
router.put("/:id", protect, async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    res.json(enquiry);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/enquiries/:id  (ADMIN)
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const enquiry = await Enquiry.findByIdAndDelete(req.params.id);
    if (!enquiry) return res.status(404).json({ message: "Enquiry not found" });
    res.json({ message: "Enquiry deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
