// // src/controllers/assessmentController.js
// const db = require('../config/db'); // Import the database configuration
// const Report = require('../models/Report'); // Import the Report model
// const { calculateScores } = require('../utils/scoreCalculator'); // Import score calculation logic

// // Function to submit a health assessment
// const submitForm = async (req, res) => {
//     try {
//         const { answers, userId, companyId, bmi } = req.body;

//         // Validate input
//         if (!answers || !userId || !companyId) {
//             return res.status(400).json({ error: "Answers, userId, and companyId are required" });
//         }

//         // Calculate the scores based on the answers
//         const scoreResults = calculateScores(answers);

//         // Create a report based on the calculated scores
//         const newReport = {
//             userId,
//             companyId,
//             healthRiskScore: scoreResults.totalScore,
//             emotionalHealthScore: scoreResults.sectionScores.mentalEmotionalWellBeing,
//             nutritionalHabitsScore: scoreResults.sectionScores.nutrition,
//             bmi: bmi || 0, // Optional field, adjust as needed
//             prevalentRiskFactors: scoreResults.riskFactors || [],
//             recommendations: scoreResults.recommendations || "Keep up the good work!"
//         };

//         // Save the report to the database using the Report model
//         const report = await Report.create(newReport);

//         res.status(201).json({ message: "Assessment submitted successfully", report });
//     } catch (error) {
//         console.error('Error submitting assessment:', error);
//         res.status(500).json({ error: "Error submitting assessment: " + error.message });
//     }
// };

// // Additional controller methods
// const viewResponses = async (userId) => {
//     // Logic to view individual responses for the given userId
// };

// const createAssessment = async (assessmentData) => {
//     // Logic to create a new assessment
// };

// const getAssessment = async (id) => {
//     // Logic to get a specific assessment by ID
// };

// // Exporting all methods
// module.exports = {
//     submitForm,
//     viewResponses,
//     createAssessment,
//     getAssessment,
// };

// src/routes/assessmentRoutes.js
const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth");
const assessmentController = require("../controllers/assessmentController");
// const { calculateScores } = require('../utils/scoreCalculator');

// Submit health assessment form (no authorization required)
router.post("/submitAssessment/:slug", assessmentController.submitAssessment);
router.post("/submit", assessmentController.submitForm);


// View individual responses (accessible by admins)
router.get("/responses", authenticate(["admin"]), async (req, res) => {
  try {
    const responses = await assessmentController.viewResponses(req.user.id);
    res.status(200).json(responses);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error retrieving responses: " + error.message });
  }
});

// Create a new assessment (admin only)
router.post("/", authenticate(["admin"]), async (req, res) => {
  try {
    const assessment = await assessmentController.createAssessment(req.body);
    res.status(201).json(assessment);
  } catch (error) {
    res
      .status(400)
      .json({ error: "Error creating assessment: " + error.message });
  }
});

// Get a specific assessment by ID (admin access)
router.get("/:id", authenticate(["admin"]), async (req, res) => {
  try {
    const assessment = await assessmentController.getAssessment(req.params.id);
    if (!assessment) {
      return res.status(404).json({ error: "Assessment not found" });
    }
    res.status(200).json(assessment);
  } catch (error) {
    res
      .status(500)
      .json({ error: "Error retrieving assessment: " + error.message });
  }
});

// Generate and Share Assessment Link
router.post(
  "/generateLink",
  authenticate(["admin", "sub-admin"]),
  async (req, res) => {
    const { name, address, email, city, company_type } = req.body;

    // Validate input
    if (!name || !address || !email || !city || !company_type) {
      return res.status(400).json({ message: "All fields are required" });
    }

    try {
      // Insert company details into the database
      const [companyResult] = await db.query(
        "INSERT INTO companies (name, address, email, city, company_type) VALUES (?, ?, ?, ?, ?)",
        [name, address, email, city, company_type]
      );

      const companyId = companyResult.insertId;

      // Generate a unique assessment link (for example, using a UUID)
      const assessmentLink = `http://localhost:5000/assessment/form/${companyId}`;

      res.status(201).json({
        message: "Assessment link generated successfully",
        link: assessmentLink,
      });
    } catch (error) {
      console.error("Error generating assessment link:", error);
      res
        .status(500)
        .json({ error: "Internal server error during link generation" });
    }
  }
);
// Submit an assessment through the form link
router.post("/form/:formLink", async (req, res) => {
  const { formLink } = req.params;
  const { answers, user_id } = req.body;

  if (!answers || !user_id) {
    return res.status(400).json({ message: "All fields are required" });
  }

  try {
    // Check if the form link exists and is not completed
    const results = await db.query(
      "SELECT * FROM assessments WHERE form_link = ? AND is_completed = false",
      [formLink]
    );

    if (results.length === 0) {
      return res.status(404).json({ message: "Invalid or expired form link" });
    }

    // Process the answers and mark the form as completed
    const assessmentId = results[0].id;
    await saveAnswers(answers, user_id, assessmentId); // Ensure saveAnswers returns a promise

    await db.query("UPDATE assessments SET is_completed = true WHERE id = ?", [
      assessmentId,
    ]);

    res
      .status(200)
      .json({ message: "Thank you for completing the assessment" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
