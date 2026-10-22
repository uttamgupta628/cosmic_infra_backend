const cloudinary = require("../config/cloudinary");

// Resolves only when Cloudinary reports the final result (has secure_url).
const uploadBrochureToCloudinary = (filePath, { folder = "brochures" } = {}) =>
  new Promise((resolve, reject) => {
    cloudinary.uploader.upload_large(
      filePath,
      {
        resource_type: "raw",
        folder,
        chunk_size: 20 * 1024 * 1024,
        use_filename: true,
        unique_filename: true,
        timeout: 10 * 60 * 1000,
      },
      (error, result) => {
        if (error) return reject(error);
        console.log("Cloudinary brochure result:", result && Object.keys(result));
        if (result?.secure_url) resolve(result);
      }
    );
  });

module.exports = uploadBrochureToCloudinary;