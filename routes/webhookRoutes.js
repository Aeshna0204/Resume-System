
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const webhookController = require("../controllers/webhookController");

// Main webhook receiver (all platforms)
router.post("/receive", webhookController.receiveWebhook);

// Get all internships
router.get("/internships", protect, webhookController.getInternships);

// Get all hackathons
router.get("/hackathons", protect, webhookController.getHackathons);

// Simulate webhook (for demo/testing)
router.post("/simulate", protect, webhookController.simulateWebhook);

module.exports = router;