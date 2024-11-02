const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const db = require("../risk_assessment/src/config/db"); // Correctly import the MySQL connection
const logger = require("./utils/logger"); // Assuming you have a logger utility

// Import route modules
const authRoutes = require("./routes/auth"); // Ensure the correct path
const userRoutes = require("./routes/userRoutes");
const companyRoutes = require("./routes/companies");
const dashboardRoutes = require("./routes/dashboard");
const assessmentRoutes = require("./routes/assessmentRoutes");

dotenv.config();

// Validate environment variables
const requiredEnvVars = ["PORT", "CORS_ORIGIN", "DB_HOST", "DB_USER", "DB_PASSWORD"];
for (const varName of requiredEnvVars) {
  if (!process.env[varName]) {
    throw new Error(`Required environment variable ${varName} is missing`);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || "*",
  methods: ["GET", "POST", "PUT", "DELETE"],
  credentials: true,
}));

app.use(express.json()); // Add this line to parse JSON requests

// MySQL Connection
db.getConnection()
  .then(() => logger.info("Connected to the database."))
  .catch((err) => {
    logger.error("Database connection failed:", err);
    process.exit(1); // Exit the process on connection failure
  });

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/companies", companyRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/assessment", assessmentRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error(err.stack);
  res.status(err.status || 500).json({ error: err.message || "Internal Server Error" });
});

// Start the server
app.listen(PORT, () => {
  logger.info(`Server running on http://localhost:${PORT}`);
});

// Graceful shutdown
process.on("SIGINT", () => {
  logger.info("Shutting down the server gracefully...");
  db.end((err) => {
    if (err) logger.error("Error closing the database connection:", err);
    process.exit(0);
  });
});
