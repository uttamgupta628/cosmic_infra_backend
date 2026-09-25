const express = require("express");
const router = express.Router();
const SiteVisit = require("../models/SiteVisit");
const { protect } = require("../middleware/auth");
const { sendAdminNotification, buildNotificationHtml } = require("../utils/Mailer");

// POST /api/site-visits  (PUBLIC - "Book a Site Visit" form)
router.post("/", async (req, res, next) => {
  try {
    const { name, phone, email, project, preferredDate, message } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ message: "Name and phone are required" });
    }
    const visit = await SiteVisit.create({ name, phone, email, project, preferredDate, message });

    // Fire-and-forget: don't await, so a slow/failed email never delays or
    // breaks the response — the lead is already saved above regardless.
    sendAdminNotification(
      "New Site Visit Request",
      buildNotificationHtml("New Site Visit Request", [
        ["Name", name],
        ["Phone", phone],
        ["Email", email],
        ["Project", project],
        ["Preferred Date", preferredDate],
        ["Message", message],
      ])
    );

    res.status(201).json({ message: "Site visit request received. We'll confirm shortly.", visit });
  } catch (err) {
    next(err);
  }
});

// GET /api/site-visits  (ADMIN)
router.get("/", protect, async (req, res, next) => {
  try {
    const { status } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    const visits = await SiteVisit.find(filter).populate("project", "title").sort({ createdAt: -1 });
    res.json(visits);
  } catch (err) {
    next(err);
  }
});

// PUT /api/site-visits/:id  (ADMIN)
router.put("/:id", protect, async (req, res, next) => {
  try {
    const visit = await SiteVisit.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!visit) return res.status(404).json({ message: "Site visit request not found" });
    res.json(visit);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/site-visits/:id  (ADMIN)
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const visit = await SiteVisit.findByIdAndDelete(req.params.id);
    if (!visit) return res.status(404).json({ message: "Site visit request not found" });
    res.json({ message: "Site visit request deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;