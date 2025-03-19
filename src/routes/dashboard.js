  const express = require("express");
const db = require('../config/db'); // Ensure this path points to the correct db.js file
const { authenticate } = require("../middlewares/auth");
const dashboardController = require('../controllers/dashboardController');
const router = express.Router();

// Dashboard stats
router.get("/stats", authenticate("admin"), async (req, res) => {
  const query = `
    SELECT 
        (SELECT COUNT(*) FROM users) AS total_users,
        (SELECT COUNT(*) FROM companies) AS total_companies,
        (SELECT COUNT(*) FROM assessments) AS total_assessments,
        (SELECT AVG(health_risk_score) FROM assessments) AS avg_health_risk_score
  `;
  
  try {
    const [results] = await db.query(query);
    const data = results[0];

    // Handle case where no assessments exist
    const avgHealthRiskScore = data.avg_health_risk_score !== null ? data.avg_health_risk_score : 0;

    res.json({
      total_users: data.total_users,
      total_companies: data.total_companies,
      total_assessments: data.total_assessments,
      avg_health_risk_score: avgHealthRiskScore,
    });
  } catch (err) {
    console.error("Error retrieving dashboard stats:", err);
    res.status(500).json({ error: "Internal server error while retrieving stats" });
  }
});

router.get('/totalUsers', dashboardController.getTotalUsers);
router.get('/totalCompanies', dashboardController.getTotalCompanies);
router.get('/sessionByCompany', dashboardController.getSessionByCompany);
router.get('/userLogs', dashboardController.getUserLogs);
router.get('/performanceMetrics', dashboardController.getPerformanceMetrics);
router.get('/fitnessHealthData', dashboardController.getFitnessHealthData);

module.exports = router;
