const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const dotenv = require("dotenv");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const path = require("path");
const db = require("./src/config/db");
const logger = require("./src/utils/logger");

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import routes
const dashboardRoutes = require("./src/routes/dashboard");
const authRoutes = require("./src/routes/auth");
const userRoutes = require("./src/routes/userRoutes");
const companies = require("./src/routes/companies");
const assessmentRoutes = require("./src/routes/assessmentRoutes");
const adminRoutes = require("./src/routes/adminRoutes");
const companyEmployeeRoutes = require("./src/routes/companyEmployeeRoutes");
const companyCalculationsRoutes = require("./src/routes/companyCalculationsRoutes");
const singleroute = require("./src/routes/singleroute");
const employeeSubmit = require('./src/routes/OnSubmit');
const onlyformentor = require("./src/routes/OnlyForMentorRoute");
// Security headers and middleware setup
app.use([
  helmet(), // Sets various HTTP headers for security
  rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 200, // Allow up to 200 requests per 15 minutes
  }),
  cors({
    origin: process.env.CORS_ORIGIN || "*", // Allow CORS from environment-defined origins or all
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true, // Allow credentials like cookies
  }),
  bodyParser.json(),
  bodyParser.urlencoded({ extended: true }), // Support URL-encoded bodies
]);

// Logging middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Route definitions - Same base URL structure, no change to route functionality
app.use("/api/auth", authRoutes);
app.use("/api/auth", userRoutes);
app.use("/api", companies); 
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/assessment", assessmentRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/company-employees", companyEmployeeRoutes);
app.use("/", companyCalculationsRoutes);
app.use('/api', employeeSubmit);
app.use("/api", onlyformentor); 
app.use('/api', singleroute);
app.use("/reports", express.static(path.join(__dirname, "public", "reports")));
app.use(cors());
app.use(bodyParser.json());
// Basic health check route (unchanged)
app.get("/", (req, res) => {
  res.json({
    message: "Health Risk Assessment API is running",
    dbStatus: db.connection ? "Connected" : "Connected",
  });
});

// Error handling middleware (unchanged)
app.use((err, req, res, next) => {
  logger.error("Error stack:", err.stack);
  res.status(err.status || 500).json({
    message: err.message || "Internal Server Error",
  });
});

// Start the server
const server = app.listen(PORT, () => {
  logger.info(`Server running on  http://backend.spectrumenterprises.com.pk:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down gracefully...");
  server.close(() => {
    logger.info("Closed all connections");
    process.exit(0);
  });
});

module.exports = app;
