const express = require("express");
const multer = require("multer");
const router = express.Router();
const streamifier = require("stream");
const cloudinary = require("../config/cloudinary");
const upload = require("../middleware/upload");
const uploadBrochureToCloudinary = require("../utils/uploadBrochure");
const { protect } = require("../middleware/auth");

// Streams a buffer (from multer's memory storage) up to Cloudinary without
// touching the local disk.
const streamUpload = (buffer, folder, resourceType) =>
  new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      { folder, resource_type: resourceType },
      (error, result) => (result ? resolve(result) : reject(error))
    );
    streamifier.Readable.from(buffer).pipe(uploadStream);
  });

// POST /api/uploads/brochure  (ADMIN) — PDF up to 1GB, form field name "file"
// Written to disk by multer, then sent to Cloudinary in chunks.
// Returns { url, publicId, resourceType, bytes }
router.post(
  "/brochure",
  protect,
  (req, res, next) => {
    upload.brochure.single("file")(req, res, (err) => {
      if (err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ message: "Brochure must be under 1GB" });
      }
      if (err) return res.status(400).json({ message: err.message });
      next();
    });
  },
  async (req, res, next) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }
      const folder = req.body.folder || "cosmic-infra/brochures";
      const result = await uploadBrochureToCloudinary(req.file.path, { folder });

      res.status(201).json({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType: result.resource_type,
        bytes: result.bytes,
      });
    } catch (err) {
      next(err);
    } finally {
      upload.removeTempFile(req.file); // always delete the temp file
    }
  }
);

// POST /api/uploads  (ADMIN) — single file, form field name "file"
// Optional body field "folder" (defaults to "cosmic-infra/projects")
// Returns { url, publicId, resourceType } — save `url` on the project.
// Images/videos only in practice (50MB cap). Use /brochure for large PDFs.
router.post("/", protect, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }
    const folder = req.body.folder || "cosmic-infra/projects";
    const resourceType = req.file.mimetype.startsWith("video")
      ? "video"
      : req.file.mimetype === "application/pdf"
      ? "raw"
      : "image";

    const result = await streamUpload(req.file.buffer, folder, resourceType);

    res.status(201).json({
      url: result.secure_url,
      publicId: result.public_id,
      resourceType: result.resource_type,
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/uploads/multiple  (ADMIN) — up to 10 files at once, form field name "files"
router.post("/multiple", protect, upload.array("files", 10), async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    const folder = req.body.folder || "cosmic-infra/projects";

    const results = await Promise.all(
      req.files.map((file) => {
        const resourceType = file.mimetype.startsWith("video") ? "video" : "image";
        return streamUpload(file.buffer, folder, resourceType);
      })
    );

    res.status(201).json(
      results.map((r) => ({ url: r.secure_url, publicId: r.public_id, resourceType: r.resource_type }))
    );
  } catch (err) {
    next(err);
  }
});

// DELETE /api/uploads/:publicId  (ADMIN) — publicId must be URL-encoded (it contains slashes)
// For brochures pass ?resourceType=raw
router.delete("/:publicId", protect, async (req, res, next) => {
  try {
    const publicId = decodeURIComponent(req.params.publicId);
    const result = await cloudinary.uploader.destroy(publicId, { resource_type: req.query.resourceType || "image" });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

module.exports = router;