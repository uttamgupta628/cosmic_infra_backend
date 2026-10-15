const express = require("express");
const router = express.Router();

const Project = require("../models/Project");
const { protect } = require("../middleware/auth");
const {
  cacheGet,
  cacheSet,
  cacheDel,
  cacheKeysByPattern,
} = require("../config/redis");

// =====================================================
// Helper: Delete project-related cache
// =====================================================

const clearProjectCache = async (project) => {
  const keys = ["projects:stats"];

  if (project?._id) {
    keys.push(`project:id:${project._id}`);
  }

  if (project?.slug) {
    keys.push(`project:slug:${project.slug}`);
  }

  // All list caches (projects:list:...) and anything else under projects:*
  const listKeys = await cacheKeysByPattern("projects:*");
  keys.push(...listKeys);

  await cacheDel([...new Set(keys)]);
};


// =====================================================
// GET /api/projects
// Admin: all
// Public: ?publicOnly=true
// =====================================================

router.get("/", async (req, res, next) => {
  try {
    const { status, search, city, publicOnly } = req.query;

    const cacheKey = `projects:list:${JSON.stringify({
      status: status || "",
      search: search || "",
      city: city || "",
      publicOnly: publicOnly || "",
    })}`;

    // 1. Redis (returns null if missing or Redis is down)
    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    // 2. MongoDB
    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (city) {
      filter.city = city;
    }

    if (publicOnly === "true") {
      filter.isPublished = true;
    }

    if (search) {
      filter.$text = { $search: search };
    }

    const projects = await Project.find(filter)
      .sort({ createdAt: -1 })
      .lean();

    // 3. Cache for 5 minutes
    await cacheSet(cacheKey, projects, 300);

    return res.json(projects);
  } catch (err) {
    next(err);
  }
});


// =====================================================
// GET /api/projects/stats
// =====================================================

router.get("/stats", protect, async (req, res, next) => {
  try {
    const cacheKey = "projects:stats";

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const [total, ongoing, completed, upcoming] = await Promise.all([
      Project.countDocuments(),
      Project.countDocuments({ status: "ongoing" }),
      Project.countDocuments({ status: "completed" }),
      Project.countDocuments({ status: "upcoming" }),
    ]);

    const stats = { total, ongoing, completed, upcoming };

    // Cache for 2 minutes
    await cacheSet(cacheKey, stats, 120);

    res.json(stats);
  } catch (err) {
    next(err);
  }
});


// =====================================================
// GET /api/projects/:idOrSlug
// =====================================================

router.get("/:idOrSlug", async (req, res, next) => {
  try {
    const { idOrSlug } = req.params;

    const isObjectId = /^[0-9a-fA-F]{24}$/.test(idOrSlug);

    const cacheKey = isObjectId
      ? `project:id:${idOrSlug}`
      : `project:slug:${idOrSlug}`;

    const cached = await cacheGet(cacheKey);
    if (cached) {
      return res.json(cached);
    }

    const query = isObjectId ? { _id: idOrSlug } : { slug: idOrSlug };

    const project = await Project.findOne(query).lean();

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Cache for 10 minutes
    await cacheSet(cacheKey, project, 600);

    return res.json(project);
  } catch (err) {
    next(err);
  }
});


// =====================================================
// POST /api/projects
// =====================================================

router.post("/", protect, async (req, res, next) => {
  try {
    const project = await Project.create(req.body);

    await clearProjectCache(project);

    res.status(201).json(project);
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({
        message: "A project with that slug already exists",
      });
    }

    next(err);
  }
});


// =====================================================
// PUT /api/projects/:id
// =====================================================

router.put("/:id", protect, async (req, res, next) => {
  try {
    const oldProject = await Project.findById(req.params.id);

    if (!oldProject) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    // Clear old + new cache (covers slug changes)
    await clearProjectCache(oldProject);
    await clearProjectCache(project);

    res.json(project);
  } catch (err) {
    next(err);
  }
});


// =====================================================
// DELETE /api/projects/:id
// =====================================================

router.delete("/:id", protect, async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    await Project.findByIdAndDelete(req.params.id);

    await clearProjectCache(project);

    res.json({
      message: "Project deleted",
    });
  } catch (err) {
    next(err);
  }
});


module.exports = router;