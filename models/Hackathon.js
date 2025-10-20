
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const HackathonSchema = new Schema({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  company: String,
  role: String,
  startDate: Date,
  endDate: Date,
  description: String,
  verified: Boolean,
});

module.exports = mongoose.model("Hackathon", HackathonSchema);
