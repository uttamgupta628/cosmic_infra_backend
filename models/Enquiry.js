const mongoose = require("mongoose");

// Generic enquiry - covers "Submit Enquiry", the "Let Us Call You" popup,
// and any other general enquiry/contact form on the public site.
const enquirySchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    email: { type: String, trim: true },
    message: { type: String, trim: true },
    source: {
      type: String,
      enum: ["popup", "project_enquiry", "contact_page", "other"],
      default: "other",
    },
    project: { type: mongoose.Schema.Types.ObjectId, ref: "Project" },
    consent: { type: Boolean, default: false },
    status: {
      type: String,
      enum: ["new", "contacted", "closed"],
      default: "new",
    },
    notes: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Enquiry", enquirySchema);
