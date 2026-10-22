const cloudinary = require("../config/cloudinary");

// Streams a file from disk to Cloudinary in 20MB chunks, so a 1GB PDF
// never has to sit in memory. Returns Cloudinary's upload result.
const uploadBrochureToCloudinary = (filePath, { folder = "brochures", publicId } = {}) =>
  cloudinary.uploader.upload_large(filePath, {
    resource_type: "raw", // PDFs this big must go up as raw files
    folder,
    public_id: publicId,
    chunk_size: 20 * 1024 * 1024,
    use_filename: true,
    unique_filename: true,
    timeout: 10 * 60 * 1000, // 10 min per chunk request
  });

module.exports = uploadBrochureToCloudinary;