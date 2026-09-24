const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const Enquiry = require("../models/Enquiry");
const SiteVisit = require("../models/SiteVisit");
const Redevelopment = require("../models/Redevelopment");
const { protect } = require("../middleware/auth");

// GET /api/dashboard/summary  (ADMIN) - powers the dashboard cards + recent enquiries table
router.get("/summary", protect, async (req, res, next) => {
  try {
    const [
      totalProjects,
      ongoingProjects,
      completedProjects,
      upcomingProjects,
      totalEnquiries,
      newEnquiries,
      totalSiteVisits,
      pendingSiteVisits,
      totalRedevelopment,
      recentEnquiries,
      recentSiteVisits,
    ] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: "ongoing" }),
      Project.countDocuments({ status: "completed" }),
      Project.countDocuments({ status: "upcoming" }),
      Enquiry.countDocuments(),
      Enquiry.countDocuments({ status: "new" }),
      SiteVisit.countDocuments(),
      SiteVisit.countDocuments({ status: "new" }),
      Redevelopment.countDocuments(),
      Enquiry.find().sort({ createdAt: -1 }).limit(5).populate("project", "title"),
      SiteVisit.find().sort({ createdAt: -1 }).limit(5).populate("project", "title"),
    ]);

    res.json({
      projects: { total: totalProjects, ongoing: ongoingProjects, completed: completedProjects, upcoming: upcomingProjects },
      enquiries: { total: totalEnquiries, new: newEnquiries },
      siteVisits: { total: totalSiteVisits, pending: pendingSiteVisits },
      redevelopment: { total: totalRedevelopment },
      recentEnquiries,
      recentSiteVisits,
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
