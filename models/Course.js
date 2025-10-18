const mongoose = require("mongoose");

const courseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  issuer: { type: String },                     // "Coursera", "Udemy", "AWS"
  credentialId: { type: String },               // issuer-specific id
  credentialUrl: { type: String },              // public verification link (if available)
  issuedAt: { type: Date },
  expiresAt: { type: Date },
  // verification fields
  verified: { type: Boolean, default: false },
  verificationStatus: { 
    type: String, 
    enum: ["unverified","submitted","auto_verified","manually_verified","rejected"], 
    default: "unverified" 
  },
  evidence: {                                    // storage pointer to uploaded proof (S3 / local path)
    fileUrl: { type: String },
    uploadedAt: { type: Date }
  },
  notes: { type: String },                       // admin notes
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

courseSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Course", courseSchema);
