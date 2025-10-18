const User =require("../models/User.js");
const Resume=require("../models/Resume.js");
const Project=require("../models/Project.js");

exports.createResume = async (req, res) => {
  const { userId } = req.params;
  try {
    const {title}=req.body;
    if(!title){
        return res.status(400).json({message:"Title is required"});
    }
    const existing = await Resume.findOne({ userId });
    if (existing) return res.status(400).json({ message: "Resume already exists" });

    const resume = await Resume.create({ userId, title });
    res.status(200).json({ message: "Resume created", data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get resume
exports.getResumes = async (req, res) => {
  const { userId } = req.params;
  try {
    const resume = await Resume.findOne({ userId })
      .populate("projects courses internships hackathons");
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json({ data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.updateGeneralInfo = async (req, res) => {
  const { userId, resumeId } = req.params; // userId from params (better: from auth token)
  // Update general info (headline, summary, contact)
// allowed fields for general info update
const allowedFields = [
  "contact",
  "headline",
  "summary",
  "languages",   // expect array of {name, proficiency}
  "interests",   // expect array of strings
  "visibility"
];
  
  try {
    // Build update object from whitelist (ignore any other keys sent in req.body)
    const update = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        update[field] = req.body[field];
      }
    }

    // Optional: Basic runtime validation / sanitization
    // - Ensure visibility is one of allowed values
    if (update.visibility && !["public", "private"].includes(update.visibility)) {
      return res.status(400).json({ message: "Invalid visibility value" });
    }

    // - Ensure languages is an array of objects (if provided)
    if (update.languages) {
      if (!Array.isArray(update.languages)) {
        return res.status(400).json({ message: "languages must be an array" });
      }
      // Basic shape check
      update.languages = update.languages.map(lang => ({
        name: String(lang.name || ""),
        proficiency: String(lang.proficiency || "")
      }));
    }

    // - Ensure interests is array of strings
    if (update.interests) {
      if (!Array.isArray(update.interests)) {
        return res.status(400).json({ message: "interests must be an array" });
      }
      update.interests = update.interests.map(i => String(i));
    }

    // Decide whether to merge contact or replace entirely.
    // Here: if contact present in request, we'll set it entirely (safer & clearer).
    // If you want merge behavior, you'd fetch current resume and merge fields manually.
    if (update.contact) {
      // sanitize contact subfields
      const contact = {};
      if (update.contact.email) contact.email = String(update.contact.email);
      if (update.contact.phone) contact.phone = String(update.contact.phone);
      if (update.contact.location) contact.location = String(update.contact.location);
      if (update.contact.socials) {
        contact.socials = {};
        if (update.contact.socials.linkedin) contact.socials.linkedin = String(update.contact.socials.linkedin);
        if (update.contact.socials.github) contact.socials.github = String(update.contact.socials.github);
        if (update.contact.socials.portfolio) contact.socials.portfolio = String(update.contact.socials.portfolio);
      }
      update.contact = contact;
    }

    // set updatedAt
    update.updatedAt = Date.now();

    // IMPORTANT: query by _id and userId to ensure resume belongs to the user
    const resume = await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      { $set: update },
      { new: true }
    );

    if (!resume) {
      return res.status(404).json({ message: "Resume not found or not owned by user" });
    }

    return res.status(200).json({ message: "General info updated", data: resume });
  } catch (error) {
    console.error("updateGeneralInfo error:", error);
    return res.status(500).json({ message: error.message });
  }
};

// Update skills

// 1️⃣ Update Skills
exports.updateSkills = async (req, res) => {
  const { userId, resumeId } = req.params;
  try {
    if (!Array.isArray(req.body.skills)) {
      return res.status(400).json({ message: "Skills must be an array of strings" });
    }

    const skills = req.body.skills.map(s => String(s).trim());

    const resume = await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      { $set: { skills, updatedAt: Date.now() } },
      { new: true }
    );

    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json({ message: "Skills updated", data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2️⃣ Update Achievements
exports.updateAchievements = async (req, res) => {
  const { userId, resumeId } = req.params;
  try {
    if (!Array.isArray(req.body.achievements)) {
      return res.status(400).json({ message: "Achievements must be an array of strings" });
    }

    const achievements = req.body.achievements.map(a => String(a).trim());

    const resume = await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      { $set: { achievements, updatedAt: Date.now() } },
      { new: true }
    );

    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json({ message: "Achievements updated", data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3️⃣ Update Experience
exports.updateExperience = async (req, res) => {
  const { userId, resumeId } = req.params;
  try {
    if (!Array.isArray(req.body.experience)) {
      return res.status(400).json({ message: "Experience must be an array" });
    }

    const experience = req.body.experience.map(exp => ({
      title: String(exp.title || ""),
      company: String(exp.company || ""),
      startDate: exp.startDate ? new Date(exp.startDate) : null,
      endDate: exp.endDate ? new Date(exp.endDate) : null,
      description: String(exp.description || ""),
      location: String(exp.location || ""),
      isCurrent: Boolean(exp.isCurrent || false)
    }));

    const resume = await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      { $set: { experience, updatedAt: Date.now() } },
      { new: true }
    );

    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json({ message: "Experience updated", data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4️⃣ Update Education
exports.updateEducation = async (req, res) => {
  const { userId, resumeId } = req.params;
  try {
    if (!Array.isArray(req.body.education)) {
      return res.status(400).json({ message: "Education must be an array" });
    }

    const education = req.body.education.map(ed => ({
      school: String(ed.school || ""),
      degree: String(ed.degree || ""),
      fieldOfStudy: String(ed.fieldOfStudy || ""),
      startDate: ed.startDate ? new Date(ed.startDate) : null,
      endDate: ed.endDate ? new Date(ed.endDate) : null,
      grade: String(ed.grade || ""),
      description: String(ed.description || "")
    }));

    const resume = await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      { $set: { education, updatedAt: Date.now() } },
      { new: true }
    );

    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json({ message: "Education updated", data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSingleEducation = async (req, res) => {
  const { userId, resumeId, educationId } = req.params;
  const updateData = req.body;

  try {
    const resume = await Resume.findOneAndUpdate(
      { _id: resumeId, userId, "education._id": educationId },
      {
        $set: {
          "education.$": updateData,
          updatedAt: Date.now()
        }
      },
      { new: true }
    );

    if (!resume) return res.status(404).json({ message: "Education entry not found" });
    res.status(200).json({ message: "Education updated", data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.upsertProject = async (req, res) => {
  const { userId, resumeId } = req.params;
  const projectData = req.body;

  try {
    let project;

    // 🔹 Case 1: Update existing project
    if (projectData._id) {
      project = await Project.findOneAndUpdate(
        { _id: projectData._id, userId },
        {
          $set: {
            title: projectData.title,
            shortDescription: projectData.shortDescription,
            description: projectData.description,
            techStack: projectData.techStack || [],
            role: projectData.role,
            contributions: projectData.contributions || [],
            repoUrl: projectData.repoUrl,
            liveUrl: projectData.liveUrl,
            startDate: projectData.startDate,
            endDate: projectData.endDate,
            isTeamProject: projectData.isTeamProject ?? true,
            visibility: projectData.visibility || "public",
            updatedAt: Date.now()
          }
        },
        { new: true }
      );

      if (!project) {
        return res.status(404).json({ message: "Project not found or unauthorized" });
      }

      return res.status(200).json({ message: "Project updated", data: project });
    }

    // 🔹 Case 2: Create new project
    project = new Project({
      userId,
      title: projectData.title,
      shortDescription: projectData.shortDescription,
      description: projectData.description,
      techStack: projectData.techStack || [],
      role: projectData.role,
      contributions: projectData.contributions || [],
      repoUrl: projectData.repoUrl,
      liveUrl: projectData.liveUrl,
      startDate: projectData.startDate,
      endDate: projectData.endDate,
      isTeamProject: projectData.isTeamProject ?? true,
      visibility: projectData.visibility || "public"
    });

    await project.save();

    // 🔗 Add project reference to resume
    await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      { $addToSet: { projects: project._id }, $set: { updatedAt: Date.now() } }
    );

    res.status(201).json({ message: "Project created", data: project });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
