const express = require("express");
const resumeController = require("../controllers/resumeController.js");
const { protect } = require("../middleware/authMiddleware.js");
const upload = require("../middleware/uploadMiddleware.js");

const { authenticate, authorizeOwner, optionalAuth } = require('../middleware/rateLimiter.js');
const { validateResume, validateObjectId } = require('../middleware/validation');
const { exportLimiter, createLimiter } = require('../middleware/rateLimiter');

const router = express.Router();

router.post("/create-resume",protect,createLimiter, resumeController.createResume);
router.get("/get-all-resumes", protect, resumeController.getResumes);
router.put("/update-general-info/:resumeId", protect, resumeController.updateGeneralInfo);
router.put("/update-skills/:resumeId",protect, resumeController.updateSkills);
router.put("/update-education/:resumeId",protect, resumeController.updateEducation);
router.put("/update-experience/:resumeId",protect, resumeController.updateExperience);
router.put("/update-achievements/:resumeId",protect, resumeController.updateAchievements);
router.put("/update-single-education/:resumeId/:educationId",protect, resumeController.updateSingleEducation);
router.put("/update-projects/:resumeId",protect, resumeController.upsertProject);

router.get("/get-full-resume/:resumeId",protect,resumeController.getFullResume);

router.get('/export-resume/:resumeId/export',exportLimiter, resumeController.exportResume); // ?format=pdf or ?format=json
router.get('/export-resume/:resumeId/export/pdf',exportLimiter, resumeController.exportResumeToPDF);
router.get('/export-resume/:resumeId/export/json',exportLimiter, resumeController.exportResumeAsJSON);

router.delete("/delete-resume/:id",protect,resumeController.deleteResume);

module.exports = router;
