const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const githubController = require("../controllers/githubController");

// Enable/disable real-time sync
router.post("/enable-realtime", protect, githubController.enableRealtimeSync);
router.post("/disable-realtime", protect, githubController.disableRealtimeSync);

// Manual sync (for demo)
router.post("/sync-now", protect, githubController.syncNow);

// Check status
router.get("/sync-status", protect, githubController.getSyncStatus);

module.exports = router;
