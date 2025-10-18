const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db.js");
const authRoutes = require("./routes/authRoutes.js");
const resumeRoutes=require("./routes/resumeRoutes.js");

dotenv.config();
const app = express();

// middlewares
app.use(cors());
app.use(express.json());

// connect DB
connectDB();

// routes
app.use("/api/auth", authRoutes);
app.use("/api/resumes",resumeRoutes);

app.get("/", (req, res) => {
  res.send("✅ Resume System Backend Running...");
});

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
