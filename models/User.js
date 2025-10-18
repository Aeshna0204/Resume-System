const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  // canonical contact / profile info
  phone: { type: String },
  location: { type: String },            // e.g. "Bengaluru, India"
  headline: { type: String },            // short tagline
  socials: {                             
    linkedin: { type: String },
    github: { type: String },
    portfolio: { type: String }
  },
  avatarUrl: { type: String },           // optional profile picture
  // preferences / metadata
  isAdmin: { type: Boolean, default: false }
}, { timestamps: true });


// hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

// match password during login
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const User = mongoose.model("User", userSchema);
module.exports = User;
