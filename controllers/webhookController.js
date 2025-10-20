
const crypto = require("crypto");
const Internship = require("../models/Internship");
const Hackathon = require("../models/Hackathon");
const Resume = require("../models/Resume");
const User = require("../models/User");


// WEBHOOK RECEIVER - Main Entry Point

exports.receiveWebhook = async (req, res) => {
  try {
    const { platform, event_type, user_identifier, data } = req.body;
    const signature = req.headers["x-webhook-signature"];

    console.log(`📥 Webhook received from ${platform}: ${event_type}`);

    // 1. Verify webhook signature
    const webhookSecret = process.env[`${platform.toUpperCase()}_WEBHOOK_SECRET`];
    
    if (webhookSecret && !verifySignature(req.body, signature, webhookSecret)) {
      console.log(" Invalid signature");
      return res.status(401).json({ error: "Invalid webhook signature" });
    }

    // 2. Find user by email or platform-specific ID
    const user = await User.findOne({ 
      $or: [
        { email: user_identifier },
        { [`socials.${platform}`]: user_identifier }
      ]
    });

    if (!user) {
      console.log(`  User not found: ${user_identifier}`);
      return res.status(404).json({ error: "User not found" });
    }

    console.log(` User found: ${user.email}`);

    // 3. Process based on event type
    let result;
    
    switch (event_type) {
      case "internship.completed":
      case "internship.started":
        result = await handleInternshipEvent(user._id, data, platform);
        break;

      case "hackathon.participated":
      case "hackathon.won":
        result = await handleHackathonEvent(user._id, data, platform);
        break;

      case "course.completed":
        result = await handleCourseEvent(user._id, data, platform);
        break;

      default:
        console.log(`⚠️  Unknown event type: ${event_type}`);
        return res.status(400).json({ error: "Unknown event type" });
    }

    console.log(` Event processed successfully`);

    res.status(200).json({
      success: true,
      message: "Webhook processed successfully",
      itemId: result.itemId,
      addedToResumes: result.resumesUpdated
    });

  } catch (error) {
    console.error(" Webhook error:", error.message);
    res.status(500).json({ error: error.message });
  }
};


// HANDLE INTERNSHIP EVENT

async function handleInternshipEvent(userId, data, platform) {
  console.log(` Processing internship from ${platform}`);

  // Platform-specific data adapters
  const adapters = {
    internshala: (d) => ({
      company: d.company_name || d.employer,
      role: d.position || d.role || d.profile,
      startDate: d.start_date ? new Date(d.start_date) : null,
      endDate: d.end_date ? new Date(d.end_date) : null,
      description: d.responsibilities || d.work_description || d.description,
      verified: true
    }),
    
    angellist: (d) => ({
      company: d.company?.name || d.startup_name,
      role: d.title || d.position,
      startDate: d.started_at ? new Date(d.started_at) : null,
      endDate: d.ended_at ? new Date(d.ended_at) : null,
      description: d.description || `Internship at ${d.company?.name}`,
      verified: true
    }),

    linkedin: (d) => ({
      company: d.companyName || d.company,
      role: d.title,
      startDate: new Date(d.startDate.year, d.startDate.month - 1),
      endDate: d.endDate ? new Date(d.endDate.year, d.endDate.month - 1) : null,
      description: d.description,
      verified: true
    })
  };

  const adapter = adapters[platform.toLowerCase()];
  if (!adapter) {
    throw new Error(`Platform adapter not found: ${platform}`);
  }

  const internshipData = adapter(data);

  // Check if already exists
  const existing = await Internship.findOne({
    userId,
    company: internshipData.company,
    role: internshipData.role
  });

  if (existing) {
    console.log(`  Internship already exists`);
    return { itemId: existing._id, resumesUpdated: 0 };
  }

  // Create internship
  const internship = await Internship.create({
    userId,
    ...internshipData
  });

  console.log(` Internship created: ${internship.company} - ${internship.role}`);

  // Auto-add to all resumes
  const resumesUpdated = await addToAllResumes(userId, internship._id, 'internships');

  return { itemId: internship._id, resumesUpdated };
}


// HANDLE HACKATHON EVENT

async function handleHackathonEvent(userId, data, platform) {
  console.log(` Processing hackathon from ${platform}`);

  // Platform-specific data adapters
  const adapters = {
    devfolio: (d) => ({
      company: d.hackathon_name || d.event_name,
      role: d.project_title || d.submission_title,
      startDate: d.start_date ? new Date(d.start_date) : null,
      endDate: d.end_date ? new Date(d.end_date) : null,
      description: d.project_description || d.description,
      verified: true
    }),

    devpost: (d) => ({
      company: d.hackathon?.title || d.challenge_name,
      role: d.title || d.project_name,
      startDate: d.submission_date ? new Date(d.submission_date) : null,
      endDate: d.submission_date ? new Date(d.submission_date) : null,
      description: d.tagline || d.description,
      verified: true
    }),

    mlh: (d) => ({
      company: d.event_name || 'MLH Hackathon',
      role: d.project_name,
      startDate: d.event_start ? new Date(d.event_start) : null,
      endDate: d.event_end ? new Date(d.event_end) : null,
      description: d.project_description,
      verified: true
    })
  };

  const adapter = adapters[platform.toLowerCase()];
  if (!adapter) {
    throw new Error(`Platform adapter not found: ${platform}`);
  }

  const hackathonData = adapter(data);

  // Check if already exists
  const existing = await Hackathon.findOne({
    userId,
    company: hackathonData.company,
    role: hackathonData.role
  });

  if (existing) {
    console.log(`⏭️  Hackathon already exists`);
    return { itemId: existing._id, resumesUpdated: 0 };
  }

  // Create hackathon
  const hackathon = await Hackathon.create({
    userId,
    ...hackathonData
  });

  console.log(` Hackathon created: ${hackathon.company} - ${hackathon.role}`);

  // Auto-add to all resumes
  const resumesUpdated = await addToAllResumes(userId, hackathon._id, 'hackathons');

  return { itemId: hackathon._id, resumesUpdated };
}


// HANDLE COURSE EVENT (from webhook)

async function handleCourseEvent(userId, data, platform) {
  const Course = require("../models/Course");

  const adapters = {
    coursera: (d) => ({
      title: d.course_name || d.name,
      issuer: "Coursera",
      credentialId: d.certificate_id || d.id,
      credentialUrl: d.certificate_url || d.url,
      issuedAt: d.completion_date ? new Date(d.completion_date) : null,
      verified: true,
      verificationStatus: "auto_verified"
    }),

    udemy: (d) => ({
      title: d.course_title || d.name,
      issuer: "Udemy",
      credentialId: d.cert_id || d.certificate_id,
      credentialUrl: d.cert_link || d.certificate_url,
      issuedAt: d.completed_at ? new Date(d.completed_at) : null,
      verified: true,
      verificationStatus: "auto_verified"
    })
  };

  const adapter = adapters[platform.toLowerCase()];
  const courseData = adapter(data);

  const existing = await Course.findOne({
    userId,
    credentialId: courseData.credentialId
  });

  if (existing) {
    return { itemId: existing._id, resumesUpdated: 0 };
  }

  const course = await Course.create({
    userId,
    ...courseData
  });

  const resumesUpdated = await addToAllResumes(userId, course._id, 'courses');

  return { itemId: course._id, resumesUpdated };
}


// Add to all resumes

async function addToAllResumes(userId, itemId, fieldName) {
  const resumes = await Resume.find({ userId });
  let updated = 0;

  for (const resume of resumes) {
    if (!resume[fieldName].includes(itemId)) {
      resume[fieldName].push(itemId);
      resume.lastSyncedAt = new Date();
      await resume.save();
      updated++;
    }
  }

  console.log(`📄 Added to ${updated} resume(s)`);
  return updated;
}


// Verify webhook signature

function verifySignature(payload, signature, secret) {
  if (!signature || !secret) return false;

  const hash = crypto
    .createHmac("sha256", secret)
    .update(JSON.stringify(payload))
    .digest("hex");

  const expectedSignature = `sha256=${hash}`;

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
}


// SIMULATOR - For Demo Purposes

exports.simulateWebhook = async (req, res) => {
  try {
    const { platform, eventType, userEmail } = req.body;

    console.log(`🧪 Simulating ${platform} webhook: ${eventType}`);

    // Generate realistic test data
    const simulatedData = generateSimulatedData(platform, eventType);

    // Create webhook payload
    const webhookPayload = {
      platform,
      event_type: eventType,
      user_identifier: userEmail,
      data: simulatedData
    };

    // Generate signature
    const secret = process.env[`${platform.toUpperCase()}_WEBHOOK_SECRET`] || "test_secret";
    const signature = `sha256=${crypto
      .createHmac("sha256", secret)
      .update(JSON.stringify(webhookPayload))
      .digest("hex")}`;

    console.log(signature);
    // Call the webhook handler
    req.body = webhookPayload;
    req.headers["x-webhook-signature"] = signature;


    await exports.receiveWebhook(req, res);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// GENERATE SIMULATED DATA

function generateSimulatedData(platform, eventType) {
  const templates = {
    internshala: {
      "internship.completed": {
        company_name: "Tech Innovators Pvt Ltd",
        position: "Full Stack Development Intern",
        start_date: "2024-06-01",
        end_date: "2024-08-31",
        responsibilities: "Developed RESTful APIs using Node.js and Express. Built responsive frontend using React. Integrated MongoDB for data persistence.",
        certificate_url: "https://internshala.com/student/certificate/123456789"
      }
    },

    devfolio: {
      "hackathon.participated": {
        hackathon_name: "Smart India Hackathon 2024",
        project_title: "AI-Powered Resume Builder",
        start_date: "2024-09-15",
        end_date: "2024-09-17",
        project_description: "Built an AI-powered resume builder using GPT-4 for content generation and React for frontend. Implemented real-time collaboration features.",
        team_size: 4,
        prize: "Winner - Track 2"
      }
    },

    coursera: {
      "course.completed": {
        course_name: "Machine Learning Specialization",
        certificate_id: `COURSERA-${Date.now()}`,
        certificate_url: `https://coursera.org/verify/DEMO${Date.now()}`,
        completion_date: new Date().toISOString(),
        instructor: "Andrew Ng",
        grade: "95.5%"
      }
    },

    angellist: {
      "internship.completed": {
        company: { name: "YC Startup Inc" },
        title: "Product Management Intern",
        started_at: "2024-05-01",
        ended_at: "2024-07-31",
        description: "Led product roadmap for mobile app. Conducted user interviews and A/B testing."
      }
    }
  };

  return templates[platform]?.[eventType] || {
    message: "Simulated data",
    timestamp: new Date().toISOString()
  };
}


// GET ALL INTERNSHIPS

exports.getInternships = async (req, res) => {
  try {
    const userId = req.user.id;
    const internships = await Internship.find({ userId }).sort({ startDate: -1 });

    res.json({
      success: true,
      count: internships.length,
      internships
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};


// GET ALL HACKATHONS

exports.getHackathons = async (req, res) => {
  try {
    const userId = req.user.id;
    const hackathons = await Hackathon.find({ userId }).sort({ startDate: -1 });

    res.json({
      success: true,
      count: hackathons.length,
      hackathons
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = exports;