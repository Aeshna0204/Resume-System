const User =require("../models/User.js");
const jwt = require("jsonwebtoken");

// generate JWT token
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

// @desc Register User
const registerUser = async (req, res) => {
  try {
    const { name, email, password , phone,location,headline,socials} = req.body;

    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: "User already exists" });

    const user = await User.create({ name, email, password , phone, location,headline,socials});

    res.status(201).json({
      message: "User registered successfully",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const uploadAvatar = async (req, res) => {

  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    // The image URL from Cloudinary
    user.avatarUrl = req.file.path;  // Multer+Cloudinary gives this path
    await user.save();

    res.status(200).json({
      message: "Profile picture uploaded successfully",
      avatarUrl: user.avatarUrl,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error uploading avatar" });
  }
};




// @desc Login User
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    res.status(200).json({
      message: "Login successful",
      user: {
        _id: user._id,
        name: user.name,
        email: user.email
      },
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser , uploadAvatar};