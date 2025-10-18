const express = require("express");
const resumeController = require("../controllers/resumeController.js");
const { protect } = require("../middleware/authMiddleware.js");
const upload = require("../middleware/uploadMiddleware.js");

const router = express.Router();

router.post("/create-resume/:userId",protect, resumeController.createResume);
router.get("/get-all-resumes/:userId", protect, resumeController.getResumes);
router.put("/update-general-info/:userId/:resumeId", protect, resumeController.updateGeneralInfo);
router.put("/update-skills/:userId/:resumeId",protect, resumeController.updateSkills);
router.put("/update-education/:userId/:resumeId",protect, resumeController.updateEducation);
router.put("/update-experience/:userId/:resumeId",protect, resumeController.updateExperience);
router.put("/update-achievements/:userId/:resumeId",protect, resumeController.updateAchievements);
router.put("/update-single-education/:userId/:resumeId/:educationId",protect, resumeController.updateSingleEducation);
router.put("/update-projects/:userId/:resumeId",protect, resumeController.upsertProject);
module.exports = router;
