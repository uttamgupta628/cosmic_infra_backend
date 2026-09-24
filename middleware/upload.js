const multer = require("multer");

// Files are kept in memory only long enough to stream them to Cloudinary —
// nothing is written to local disk, which matters on hosts like Render
// where the filesystem is ephemeral.
const storage = multer.memoryStorage();

const allowedTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "video/webm",
  "application/pdf", // brochures
];

const fileFilter = (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Unsupported file type. Allowed: jpg, png, webp, gif, mp4, mov, webm"));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB — covers property photos and short walkthrough videos
});

module.exports = upload;
