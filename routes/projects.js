const express = require("express");
const router = express.Router();

const Project = require("../models/Project");
const { protect } = require("../middleware/auth");
const { redisClient } = require("../config/redis");

// =====================================================
// Helper: Delete project-related cache
// =====================================================

const clearProjectCache = async (project) => {
  try {
    const keys = [
      "projects:all",
      "projects:stats",
    ];

    if (project?._id) {
      keys.push(`project:id:${project._id}`);
    }

    if (project?.slug) {
      keys.push(`project:slug:${project.slug}`);
    }

    // Also clear filtered project caches
    const cachedKeys = await redisClient.keys("projects:*");

    if (cachedKeys.length > 0) {
      keys.push(...cachedKeys);
    }

    // Remove duplicate keys
    const uniqueKeys = [...new Set(keys)];

    if (uniqueKeys.length > 0) {
      await redisClient.del(uniqueKeys);
    }

    console.log("Project cache cleared");
  } catch (error) {
    console.error("Redis cache clear error:", error.message);
  }
};


// =====================================================
// GET /api/projects
// Admin: all
// Public: ?publicOnly=true
// =====================================================

router.get("/", async (req, res, next) => {
  try {
    const { status, search, city, publicOnly } = req.query;

    // Create unique cache key based on query
    const cacheKey = `projects:list:${JSON.stringify({
      status: status || "",
      search: search || "",
      city: city || "",
      publicOnly: publicOnly || "",
    })}`;

    // -------------------------------------------------
    // 1. Check Redis
    // -------------------------------------------------

    const cachedProjects = await redisClient.get(cacheKey);

    if (cachedProjects) {
      console.log("Projects fetched from Redis");

      return res.json(JSON.parse(cachedProjects));
    }

    // -------------------------------------------------
    // 2. Redis miss → MongoDB
    // -------------------------------------------------

    console.log("Projects fetched from MongoDB");

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

    // -------------------------------------------------
    // 3. Save result in Redis
    // Cache for 5 minutes
    // -------------------------------------------------

    await redisClient.set(
      cacheKey,
      JSON.stringify(projects),
      {
        EX: 300,
      }
    );

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

    // -------------------------------------------------
    // Check Redis
    // -------------------------------------------------

    const cachedStats = await redisClient.get(cacheKey);

    if (cachedStats) {
      console.log("Project stats fetched from Redis");

      return res.json(JSON.parse(cachedStats));
    }

    // -------------------------------------------------
    // Redis miss → MongoDB
    // -------------------------------------------------

    console.log("Project stats fetched from MongoDB");

    const [total, ongoing, completed, upcoming] =
      await Promise.all([
        Project.countDocuments(),
        Project.countDocuments({ status: "ongoing" }),
        Project.countDocuments({ status: "completed" }),
        Project.countDocuments({ status: "upcoming" }),
      ]);

    const stats = {
      total,
      ongoing,
      completed,
      upcoming,
    };

    // Cache for 2 minutes
    await redisClient.set(
      cacheKey,
      JSON.stringify(stats),
      {
        EX: 120,
      }
    );

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

    const isObjectId = idOrSlug.match(
      /^[0-9a-fA-F]{24}$/
    );

    const cacheKey = isObjectId
      ? `project:id:${idOrSlug}`
      : `project:slug:${idOrSlug}`;

    // -------------------------------------------------
    // 1. Check Redis
    // -------------------------------------------------

    const cachedProject = await redisClient.get(cacheKey);

    if (cachedProject) {
      console.log("Project fetched from Redis");

      return res.json(JSON.parse(cachedProject));
    }

    // -------------------------------------------------
    // 2. Redis miss → MongoDB
    // -------------------------------------------------

    console.log("Project fetched from MongoDB");

    const query = isObjectId
      ? { _id: idOrSlug }
      : { slug: idOrSlug };

    const project = await Project.findOne(query).lean();

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // -------------------------------------------------
    // 3. Save in Redis
    // Cache for 10 minutes
    // -------------------------------------------------

    await redisClient.set(
      cacheKey,
      JSON.stringify(project),
      {
        EX: 600,
      }
    );

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
    // Save to MongoDB first
    const project = await Project.create(req.body);

    // Clear cache
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
    // Get old project first
    const oldProject = await Project.findById(req.params.id);

    if (!oldProject) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Update MongoDB
    const project = await Project.findByIdAndUpdate(
      req.params.id,
      req.body,
      {
        new: true,
        runValidators: true,
      }
    );

    // Clear old + new cache
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
    // Get project before deleting
    const project = await Project.findById(req.params.id);

    if (!project) {
      return res.status(404).json({
        message: "Project not found",
      });
    }

    // Delete from MongoDB
    await Project.findByIdAndDelete(req.params.id);

    // Delete Redis cache
    await clearProjectCache(project);

    res.json({
      message: "Project deleted",
    });

  } catch (err) {
    next(err);
  }
});


module.exports = router;