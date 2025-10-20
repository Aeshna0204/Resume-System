
const express = require("express");
const router = express.Router();
const { protect } = require("../middleware/authMiddleware");
const credlyController = require("../controllers/credlyController");

// Manual badge verification (works for private profiles)
router.post("/add-badge", protect, credlyController.addCredlyBadge);

//  Bulk import from public profile
router.post("/import-profile", protect, credlyController.importFromProfile);

module.exports = router;