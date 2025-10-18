const mongoose = require("mongoose");

const projectSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true, trim: true },
  shortDescription: { type: String },
  description: { type: String },                 // longer description
  techStack: [String],                           // ["Node.js","MongoDB"]
  role: { type: String },                        // "Frontend", "Backend"
  contributions: [String],                       // bullet points of contributions
  repoUrl: { type: String },
  liveUrl: { type: String },
  startDate: { type: Date },
  endDate: { type: Date },
  isTeamProject: { type: Boolean, default: true },
  visibility: { type: String, enum: ["public","private"], default: "public" },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// update updatedAt on save
projectSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Project", projectSchema);
