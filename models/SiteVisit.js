const mongoose = require("mongoose");

const siteVisitSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    preferredDate: { type: Date },
    message: { type: String, trim: true },
    status: {
      type: String,
      enum: ["new", "scheduled", "completed", "cancelled"],
      default: "new",
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SiteVisit", siteVisitSchema);
