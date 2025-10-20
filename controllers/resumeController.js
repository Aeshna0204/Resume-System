const User =require("../models/User.js");
const Resume=require("../models/Resume.js");
const Project=require("../models/Project.js");
const PDFDocument = require('pdfkit');

exports.createResume = async (req, res) => {
  const  userId  = req.user.id;
  try {
    const {title}=req.body;
    if(!title){
        return res.status(400).json({message:"Title is required"});
    }
    const existing = await Resume.findOne({ userId, title });
    if (existing) return res.status(400).json({ message: "Resume already exists" });

    const resume = await Resume.create({ userId, title });
    res.status(200).json({ message: "Resume created", data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get resume
exports.getResumes = async (req, res) => {
  const  userId  = req.user.id;
  try {
    const resume = await Resume.find({ userId })
      .populate("projects courses internships hackathons");
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json({ data: resume });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};



exports.updateGeneralInfo = async (req, res) => {
  const { resumeId } = req.params; 
  const userId= req.user.id;
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
    // If we want merge behavior,we can fetch current resume and merge fields manually.
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



//  Update Skills
exports.updateSkills = async (req, res) => {
  const { resumeId } = req.params;
  const userId= req.user.id;
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

// Update Achievements
exports.updateAchievements = async (req, res) => {
  const { resumeId } = req.params;
  const userId= req.user.id;
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

// Update Experience
exports.updateExperience = async (req, res) => {
  const { resumeId } = req.params;
  const userId= req.user.id;
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

//  Update Education
exports.updateEducation = async (req, res) => {
  const { resumeId } = req.params;
  const userId= req.user.id;
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
  const { resumeId, educationId } = req.params;
  const userId= req.user.id;
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
  const {  resumeId } = req.params;
  const userId= req.user.id;
  const projectData = req.body;

  try {
    let project;

    //  Case 1: Update existing project
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

    //  Case 2: Create new project
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

    //  Add project reference to resume
    await Resume.findOneAndUpdate(
      { _id: resumeId, userId },
      { $addToSet: { projects: project._id }, $set: { updatedAt: Date.now() } }
    );

    res.status(201).json({ message: "Project created", data: project });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};


exports.getFullResume = async (req, res) => {
  try {
    const {resumeId} = req.params;
    const resume = await Resume.findById(resumeId)
      .populate("projects")
      .populate("courses")
      .populate("internships")
      .populate("hackathons")
      .lean(); // convert to plain object

    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    // Fetch user details
    const user = await User.findById(resume.userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Merge contact info:
    // - Resume overrides User contact if present
    const mergedContact = {
      email: resume.contact?.email || user.email,
      phone: resume.contact?.phone || user.phone,
      location: resume.contact?.location || user.location,
      socials: {
        linkedin: resume.contact?.socials?.linkedin || user.socials?.linkedin,
        github: resume.contact?.socials?.github || user.socials?.github,
        portfolio: resume.contact?.socials?.portfolio || user.socials?.portfolio,
      },
    };

    // Build the final combined response
    const fullResume = {
      _id: resume._id,
      title: resume.title,
      user: {
        id: user._id,
        name: user.name,
        avatarUrl: user.avatarUrl,
        headline: user.headline || resume.headline,
        contact: mergedContact,
      },
      summary: resume.summary,
      skills: resume.skills,
      achievements: resume.achievements,
      experience: resume.experience,
      education: resume.education,
      projects: resume.projects,
      courses: resume.courses,
      internships: resume.internships,
      hackathons: resume.hackathons,
      languages: resume.languages,
      interests: resume.interests,
      visibility: resume.visibility,
      lastSyncedAt: resume.lastSyncedAt,
      createdAt: resume.createdAt,
      updatedAt: resume.updatedAt,
    };

    res.json({
      success: true,
      resume: fullResume,
    });

  } catch (error) {
    console.error("Error fetching full resume:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

exports.exportResumeToPDF = async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    // Fetch resume data (reusing your logic)
    const resume = await Resume.findById(resumeId)
      .populate("projects")
      .populate("courses")
      .populate("internships")
      .populate("hackathons")
      .lean();

    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    const user = await User.findById(resume.userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Merge contact info
    const mergedContact = {
      email: resume.contact?.email || user.email,
      phone: resume.contact?.phone || user.phone,
      location: resume.contact?.location || user.location,
      socials: {
        linkedin: resume.contact?.socials?.linkedin || user.socials?.linkedin,
        github: resume.contact?.socials?.github || user.socials?.github,
        portfolio: resume.contact?.socials?.portfolio || user.socials?.portfolio,
      },
    };

    // Create PDF
    const doc = new PDFDocument({ 
      size: 'A4', 
      margins: { top: 50, bottom: 50, left: 50, right: 50 }
    });

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.title || 'resume'}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

   
    // PDF CONTENT GENERATION
    // Header - Name & Contact
    doc.fontSize(24).font('Helvetica-Bold').text(user.name, { align: 'center' });
    
    if (user.headline || resume.headline) {
      doc.fontSize(12).font('Helvetica').fillColor('#666')
         .text(user.headline || resume.headline, { align: 'center' });
    }
    
    doc.moveDown(0.5);
    
    // Contact Info
    const contactLine = [
      mergedContact.email,
      mergedContact.phone,
      mergedContact.location
    ].filter(Boolean).join(' | ');
    
    doc.fontSize(10).fillColor('#444').text(contactLine, { align: 'center' });
    
    // Social Links
    const socials = [];
    if (mergedContact.socials.linkedin) socials.push(`LinkedIn: ${mergedContact.socials.linkedin}`);
    if (mergedContact.socials.github) socials.push(`GitHub: ${mergedContact.socials.github}`);
    if (mergedContact.socials.portfolio) socials.push(`Portfolio: ${mergedContact.socials.portfolio}`);
    
    if (socials.length > 0) {
      doc.fontSize(9).fillColor('#0066cc').text(socials.join(' | '), { align: 'center' });
    }
    
    doc.moveDown(1);
    addHorizontalLine(doc);

    // Summary
    if (resume.summary) {
      addSection(doc, 'PROFESSIONAL SUMMARY');
      doc.fontSize(10).fillColor('#000').font('Helvetica')
         .text(resume.summary, { align: 'justify' });
      doc.moveDown(1);
    }

    // Skills
    if (resume.skills && resume.skills.length > 0) {
      addSection(doc, 'SKILLS');
      const skillsText = resume.skills.join(' • ');
      doc.fontSize(10).fillColor('#000').font('Helvetica')
         .text(skillsText, { align: 'left' });
      doc.moveDown(1);
    }

    // Experience
    if (resume.experience && resume.experience.length > 0) {
      addSection(doc, 'EXPERIENCE');
      resume.experience.forEach((exp, index) => {
        doc.fontSize(12).font('Helvetica-Bold').fillColor('#000')
           .text(exp.title);
        
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#444')
           .text(`${exp.company} | ${formatDate(exp.startDate)} - ${exp.current ? 'Present' : formatDate(exp.endDate)}`);
        
        if (exp.description) {
          doc.fontSize(10).font('Helvetica').fillColor('#000')
             .text(exp.description, { align: 'justify' });
        }
        
        if (index < resume.experience.length - 1) doc.moveDown(0.8);
      });
      doc.moveDown(1);
    }

    // Internships
    if (resume.internships && resume.internships.length > 0) {
      addSection(doc, 'INTERNSHIPS');
      resume.internships.forEach((intern, index) => {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
           .text(intern.role || intern.title);
        
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#444')
           .text(`${intern.company} | ${formatDate(intern.startDate)} - ${formatDate(intern.endDate)}`);
        
        if (intern.description) {
          doc.fontSize(10).font('Helvetica').fillColor('#000')
             .text(intern.description, { align: 'justify' });
        }
        
        if (index < resume.internships.length - 1) doc.moveDown(0.8);
      });
      doc.moveDown(1);
    }

    // Projects
    if (resume.projects && resume.projects.length > 0) {
      addSection(doc, 'PROJECTS');
      resume.projects.forEach((project, index) => {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
           .text(project.title || project.name);
        
        if (project.technologies && project.technologies.length > 0) {
          doc.fontSize(9).font('Helvetica').fillColor('#666')
             .text(`Tech: ${project.technologies.join(', ')}`);
        }
        
        if (project.description) {
          doc.fontSize(10).font('Helvetica').fillColor('#000')
             .text(project.description, { align: 'justify' });
        }
        
        if (project.link) {
          doc.fontSize(9).fillColor('#0066cc')
             .text(`Link: ${project.link}`);
        }
        
        if (index < resume.projects.length - 1) doc.moveDown(0.8);
      });
      doc.moveDown(1);
    }

    // Hackathons
    if (resume.hackathons && resume.hackathons.length > 0) {
      addSection(doc, 'HACKATHONS');
      resume.hackathons.forEach((hack, index) => {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
           .text(hack.name || hack.title);
        
        const hackDetails = [
          hack.organizer,
          hack.achievement || hack.position,
          formatDate(hack.date)
        ].filter(Boolean).join(' | ');
        
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#444')
           .text(hackDetails);
        
        if (hack.description) {
          doc.fontSize(10).font('Helvetica').fillColor('#000')
             .text(hack.description, { align: 'justify' });
        }
        
        if (index < resume.hackathons.length - 1) doc.moveDown(0.8);
      });
      doc.moveDown(1);
    }

    // Education
    if (resume.education && resume.education.length > 0) {
      addSection(doc, 'EDUCATION');
      resume.education.forEach((edu, index) => {
        doc.fontSize(11).font('Helvetica-Bold').fillColor('#000')
           .text(edu.degree);
        
        doc.fontSize(10).font('Helvetica-Oblique').fillColor('#444')
           .text(`${edu.school} | ${formatDate(edu.startDate)} - ${edu.current ? 'Present' : formatDate(edu.endDate)}`);
        
        if (edu.gpa) {
          doc.fontSize(10).font('Helvetica').fillColor('#000')
             .text(`GPA: ${edu.gpa}`);
        }
        
        if (index < resume.education.length - 1) doc.moveDown(0.8);
      });
      doc.moveDown(1);
    }

    // Courses/Certifications
    if (resume.courses && resume.courses.length > 0) {
      addSection(doc, 'COURSES & CERTIFICATIONS');
      resume.courses.forEach((course, index) => {
        const courseLine = [
          course.title || course.name,
          course.provider || course.platform,
          course.completionDate ? formatDate(course.completionDate) : null
        ].filter(Boolean).join(' | ');
        
        doc.fontSize(10).font('Helvetica').fillColor('#000')
           .text(`• ${courseLine}`);
      });
      doc.moveDown(1);
    }

    // Achievements
    if (resume.achievements && resume.achievements.length > 0) {
      addSection(doc, 'ACHIEVEMENTS');
      resume.achievements.forEach(achievement => {
        doc.fontSize(10).font('Helvetica').fillColor('#000')
           .text(`• ${achievement}`);
      });
      doc.moveDown(1);
    }

    // Languages
    if (resume.languages && resume.languages.length > 0) {
      addSection(doc, 'LANGUAGES');
      const langText = resume.languages.map(l => 
        `${l.name} (${l.proficiency || 'Fluent'})`
      ).join(' • ');
      doc.fontSize(10).font('Helvetica').fillColor('#000')
         .text(langText);
      doc.moveDown(1);
    }

    // Interests (optional)
    if (resume.interests && resume.interests.length > 0) {
      addSection(doc, 'INTERESTS');
      doc.fontSize(10).font('Helvetica').fillColor('#000')
         .text(resume.interests.join(' • '));
    }

    // Footer
    doc.fontSize(8).fillColor('#999')
       .text(`Generated on ${new Date().toLocaleDateString()}`, 50, doc.page.height - 30, { align: 'center' });

    // Finalize PDF
    doc.end();

  } catch (error) {
    console.error("Error generating PDF:", error);
    
    // If headers not sent yet, send error JSON
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    }
  }
};

// HELPER FUNCTIONS
function addSection(doc, title) {
  doc.fontSize(14).font('Helvetica-Bold').fillColor('#000')
     .text(title.toUpperCase());
  
  // Underline
  const titleWidth = doc.widthOfString(title);
  doc.moveTo(50, doc.y + 2)
     .lineTo(50 + titleWidth + 10, doc.y + 2)
     .strokeColor('#0066cc')
     .lineWidth(2)
     .stroke();
  
  doc.moveDown(0.5);
}

function addHorizontalLine(doc) {
  doc.moveTo(50, doc.y)
     .lineTo(doc.page.width - 50, doc.y)
     .strokeColor('#ccc')
     .lineWidth(1)
     .stroke();
  doc.moveDown(0.5);
}

function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
}


// Export as JSON
exports.exportResumeAsJSON = async (req, res) => {
  try {
    const { resumeId } = req.params;
    
    const resume = await Resume.findById(resumeId)
      .populate("projects")
      .populate("courses")
      .populate("internships")
      .populate("hackathons")
      .lean();

    if (!resume) {
      return res.status(404).json({ success: false, message: "Resume not found" });
    }

    const user = await User.findById(resume.userId).lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const mergedContact = {
      email: resume.contact?.email || user.email,
      phone: resume.contact?.phone || user.phone,
      location: resume.contact?.location || user.location,
      socials: {
        linkedin: resume.contact?.socials?.linkedin || user.socials?.linkedin,
        github: resume.contact?.socials?.github || user.socials?.github,
        portfolio: resume.contact?.socials?.portfolio || user.socials?.portfolio,
      },
    };

    const fullResume = {
      _id: resume._id,
      title: resume.title,
      user: {
        id: user._id,
        name: user.name,
        headline: user.headline || resume.headline,
        contact: mergedContact,
      },
      summary: resume.summary,
      skills: resume.skills,
      achievements: resume.achievements,
      experience: resume.experience,
      education: resume.education,
      projects: resume.projects,
      courses: resume.courses,
      internships: resume.internships,
      hackathons: resume.hackathons,
      languages: resume.languages,
      interests: resume.interests,
    };

    // Set headers for file download
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${resume.title || 'resume'}.json"`);
    
    res.json(fullResume);

  } catch (error) {
    console.error("Error exporting JSON:", error);
    res.status(500).json({ success: false, error: error.message });
  }
};

// Export with format selection
exports.exportResume = async (req, res) => {
  const { format = 'pdf' } = req.query; // ?format=pdf or ?format=json

  if (format === 'json') {
    return exports.exportResumeAsJSON(req, res);
  } else if (format === 'pdf') {
    return exports.exportResumeToPDF(req, res);
  } else {
    return res.status(400).json({ 
      success: false, 
      message: "Invalid format. Use 'pdf' or 'json'" 
    });
  }
};

exports.deleteResume=async(req,res)=>{
   try {
    const resume = await Resume.findOne({ _id: req.params.id, userId: req.user._id });
    if (!resume) {
      return res.status(404).json({ message: "Resume not found or not authorized" });
    }

    await resume.deleteOne();
    res.status(200).json({ message: "Resume deleted successfully" });

  } catch (error) {
    console.error("Error deleting resume:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
};