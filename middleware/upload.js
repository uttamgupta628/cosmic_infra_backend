const multer = require("multer");
const os = require("os");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

// -----------------------------------------------------
// Images / videos: stay in memory, 50MB cap (unchanged)
// -----------------------------------------------------
const mediaTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf",
];

const mediaFilter = (req, file, cb) => {
  if (mediaTypes.includes(file.mimetype)) cb(null, true);
  else cb(new Error("Unsupported file type. Allowed: jpg, png, webp, gif, mp4, mov, webm"));
};

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: mediaFilter,
  limits: { fileSize: 50 * 1024 * 1024 },
});

// -----------------------------------------------------
// Brochures: written to disk (NOT memory), up to 1GB
// -----------------------------------------------------
const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => {
    const unique = crypto.randomBytes(8).toString("hex");
    cb(null, `brochure-${Date.now()}-${unique}${path.extname(file.originalname)}`);
  },
});

const brochureFilter = (req, file, cb) => {
  if (file.mimetype === "application/pdf") cb(null, true);
  else cb(new Error("Brochure must be a PDF file"));
};

const uploadBrochure = multer({
  storage: diskStorage,
  fileFilter: brochureFilter,
  limits: { fileSize: 1024 * 1024 * 1024 }, // 1GB
});

// Call this in a finally block after the file has been sent to Cloudinary
const removeTempFile = (file) => {
  if (file?.path) fs.unlink(file.path, () => {});
};

module.exports = upload; // existing imports keep working
module.exports.brochure = uploadBrochure;
module.exports.removeTempFile = removeTempFile;