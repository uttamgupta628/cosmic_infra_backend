const express = require("express");
const router = express.Router();
const Project = require("../models/Project");
const { protect } = require("../middleware/auth");

// GET /api/projects  (admin: all; public: only published — controlled by ?public=true)
router.get("/", async (req, res, next) => {
  try {
    const { status, search, city, publicOnly } = req.query;
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (city) filter.city = city;
    if (publicOnly === "true") filter.isPublished = true;
    if (search) filter.$text = { $search: search };

    const projects = await Project.find(filter).sort({ createdAt: -1 });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/stats
router.get("/stats", protect, async (req, res, next) => {
  try {
    const [total, ongoing, completed, upcoming] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: "ongoing" }),
      Project.countDocuments({ status: "completed" }),
      Project.countDocuments({ status: "upcoming" }),
    ]);
    res.json({ total, ongoing, completed, upcoming });
  } catch (err) {
    next(err);
  }
});

// GET /api/projects/:idOrSlug
router.get("/:idOrSlug", async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;
    const query = idOrSlug.match(/^[0-9a-fA-F]{24}$/) ? { _id: idOrSlug } : { slug: idOrSlug };
    const project = await Project.findOne(query);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// POST /api/projects
router.post("/", protect, async (req, res, next) => {
  try {
    const project = await Project.create(req.body);
    res.status(201).json(project);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "A project with that slug already exists" });
    }
    next(err);
  }
});

// PUT /api/projects/:id
router.put("/:id", protect, async (req, res, next) => {
  try {
    const project = await Project.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json(project);
  } catch (err) {
    next(err);
  }
});

// DELETE /api/projects/:id
router.delete("/:id", protect, async (req, res, next) => {
  try {
    const project = await Project.findByIdAndDelete(req.params.id);
    if (!project) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project deleted" });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
