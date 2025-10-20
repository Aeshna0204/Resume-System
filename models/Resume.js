const mongoose = require("mongoose");

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title:{type:String, required:true},                   // e.g. "Software Engineer Resume"
  // resume-level contact that can override user contact
  contact: {
    email: { type: String },
    phone: { type: String },
    location: { type: String },
    socials: {
      linkedin: { type: String },
      github: { type: String },
      portfolio: { type: String }
    }
  },

  // presentation & summary
  headline: { type: String },
  summary: { type: String },


  skills: [{ type: String }],            // lightweight array
  achievements: [{ type: String }],

  experience: [
    {
      title: String,
      company: String,
      startDate: Date,
      endDate: Date,
      description: String,
      location: String,
      isCurrent: { type: Boolean, default: false }
    }
  ],

  education: [
    {
      school: String,
      degree: String,
      fieldOfStudy: String,
      startDate: Date,
      endDate: Date,
      grade: String,
      description: String
    }
  ],

  // references to other collections
  projects: [{ type: mongoose.Schema.Types.ObjectId, ref: "Project" }],
  courses: [{ type: mongoose.Schema.Types.ObjectId, ref: "Course" }],
  internships: [{ type: mongoose.Schema.Types.ObjectId, ref: "Internship" }],
  hackathons: [{ type: mongoose.Schema.Types.ObjectId, ref: "Hackathon" }],

  // misc
  languages: [{ name: String, proficiency: String }], // e.g. {name:"Hindi", proficiency:"Native"}
  interests: [String],
  visibility: { type: String, enum: ["public","private"], default: "private" },

  // convenience meta
  lastSyncedAt: { type: Date },         // used for integrations
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// update updatedAt
resumeSchema.pre("save", function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model("Resume", resumeSchema);
