const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const connectDB = require("./config/db.js");
const authRoutes = require("./routes/authRoutes.js");
const resumeRoutes=require("./routes/resumeRoutes.js");
const githubController = require("./controllers/githubController");
const githubRoutes=require("./routes/githubRoutes.js");
const credlyRoutes=require("./routes/credlyRoutes.js");
const webhookRoutes = require("./routes/webhookRoutes");
const corsConfig = require('./config/cors');
const securityHeaders = require('./middleware/securityHeaders.js');
const {sanitizeNoSQL, preventXSS } = require('./middleware/validation');
// const mongoSanitize = require("express-mongo-sanitize");
const { 
  apiLimiter, 
  authLimiter, 
  exportLimiter,
  webhookLimiter,
  createLimiter 
} = require('./middleware/rateLimiter');



dotenv.config();
const app = express();

// middlewares
app.use(securityHeaders);
app.use(corsConfig);

// Parse body FIRST
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// THEN sanitize (after parsing)
// app.use(mongoSanitize());
app.use(sanitizeNoSQL);


// THEN prevent XSS
app.use(preventXSS);


// connect DB
connectDB();

// routes
app.use('/api/', apiLimiter);

app.use('/api/auth/login', authLimiter);
app.use('/api/auth/register', authLimiter);

app.use("/api/auth", authRoutes);
app.use("/api/resumes",resumeRoutes);
app.use("/api/github", githubRoutes);
app.use("/api/credly", credlyRoutes);

app.use('/api/webhooks', webhookLimiter);

app.use("/api/webhooks", webhookRoutes);



app.get("/", (req, res) => {
  res.send("Resume System Backend Running...");
});

// start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, async () => {
  console.log(`🚀 Server running on port ${PORT}`);

  // 🔁 restart GitHub syncs after server is up
  try {
    await githubController.restartAllSyncs();
  } catch (err) {
    console.error("Failed to restart GitHub syncs:", err);
  }
});

