const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    status: {
      type: String,
      enum: ["ongoing", "completed", "upcoming"],
      required: true,
      default: "ongoing",
    },
    location: { type: String, required: true, trim: true },
    city: { type: String, trim: true, default: "Nagpur" },
    tagline: { type: String, trim: true },
    description: { type: String, trim: true },
    configuration: { type: String, trim: true },
    areaRange: { type: String, trim: true }, 
    possessionDate: { type: String, trim: true }, 
    amenities: [{ type: String, trim: true }],
    coverImage: { type: String, trim: true },
    gallery: [{ type: String, trim: true }],
    video: { type: String },
    brochureUrl: { type: String, trim: true },
    isFeatured: { type: Boolean, default: false },
    isPublished: { type: Boolean, default: true },
  },
  { timestamps: true }
);

projectSchema.index({ title: "text", location: "text", city: "text" });

module.exports = mongoose.model("Project", projectSchema);
