const express = require("express");
const { registerUser, loginUser ,uploadAvatar} = require("../controllers/authController.js");
const { protect } = require("../middleware/authMiddleware.js");
const upload = require("../middleware/uploadMiddleware.js");

const router = express.Router();

router.post("/register", registerUser);
router.post("/login",loginUser);
router.post("/upload-avatar", protect,upload.single("avatar"),uploadAvatar );

module.exports = router;
