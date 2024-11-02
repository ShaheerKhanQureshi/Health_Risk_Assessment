// // src/controllers/assessmentController.js
// const Answer = require("../models/Answer");
// const Question = require("../models/Question");
// const Report = require("../models/Report");
// const Assessment = require("../models/Assessment"); // Keeping this for tracking assessments
// const {
//   createPdfFromResponses,
//   createPdfFromReport,
// } = require("../utils/pdfGenerator");
// const { sendEmailToUser } = require("../utils/email");
// const { body, validationResult } = require("express-validator");
// const logger = require("../utils/logger");
// const calculateScores = require("../utils/scoreCalculator");
// const db = require("../config/db"); // Database connection  


// const validateInput = (employeeInfo, answers) => {
//   // Basic validation checks (customize as needed)
//   if (!employeeInfo || !employeeInfo.name || !employeeInfo.designation || !employeeInfo.company) {
//     throw new Error("Employee information is incomplete.");
//   }
//   if (!Array.isArray(answers) || answers.length === 0) {
//     throw new Error("Answers are required.");
//   }
// };

// const submitAssessment = async (req, res) => {
//   const { slug } = req.params;
//   const { employee_info, health_assessment, answers } = req.body;

//   console.log("Running submitAssessment function");

//   try {
//     // // Validate input
//     // validateInput(employee_info, answers);

//     // Calculate scores based on answers
//     const scores = calculateScores(health_assessment);

//     // Use a transaction to ensure data integrity
//     await db.beginTransaction();

//     const query = `INSERT INTO \`${slug}_assessment_response\` 
//                    (employee_name, employee_designation, employee_company, submission_date, 
//                     personal_health_habits_score, mental_emotional_wellbeing_score, 
//                     nutrition_score, physical_activity_score, total_score, 
//                     percentage_score, risk_category) 
//                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

//     // // Await the result of the query
//     // const [result] = await db.query(query, [
//     //   employee_info.name,
//     //   employee_info.designation,
//     //   employee_info.company,
//     //   new Date(), // Current date
//     //   scores.sectionScores.personalHealthHabits,
//     //   scores.sectionScores.mentalEmotionalWellBeing,
//     //   scores.sectionScores.nutrition,
//     //   scores.sectionScores.physicalActivity,
//     //   scores.totalScore,
//     //   scores.percentageScore,
//     //   scores.riskCategory
//     // ]);

//     // Commit the transaction
//     await db.commitTransaction();

//     res.status(200).json({ message: "Success", result });
//   } catch (err) {
//     // // Rollback transaction in case of error
//     // await db.rollbackTransaction();

//     console.error("Database insertion error:", err.message); // Log error for debugging
//     res.status(500).json({ message: "Error while entering form", error: err.message });
//   }
// };


// // Function to submit a health assessment
// const submitForm = async (req, res) => {
//   try {
//     const { answers, userId, companyId, bmi = 0 } = req.body;
//     console.log(req.body);
//     // Validate input
//     if (!answers || !userId || !companyId) {
//       return res.status(400).json({ error: "Answers are required" });
//     }

//     // Calculate the scores based on the answers
//     const scoreResults = calculateScores(answers);

//     // Fetch questions and validate answers
//     const answerRecords = [];
//     let totalScore = 0;

//     for (const answerData of answers) {
//       const { questionId, response } = answerData;
//       const question = await Question.findById(questionId);

//       if (!question) {
//         logger.error(`Question not found: ${questionId}`);
//         return res.status(400).json({ error: "Question not found" });
//       }

//       const answer = new Answer({
//         user: userId,
//         question: questionId,
//         response,
//       });
//       await answer.save();
//       answerRecords.push(answer);
//       totalScore += question.scoring; // Adjust based on your scoring logic
//     }

//     // Create a report based on the calculated scores
//     const newReport = {
//       userId,
//       companyId,
//       healthRiskScore: scoreResults.totalScore,
//       emotionalHealthScore: scoreResults.sectionScores.mentalEmotionalWellBeing,
//       nutritionalHabitsScore: scoreResults.sectionScores.nutrition,
//       bmi,
//       prevalentRiskFactors: scoreResults.riskFactors || [],
//       recommendations: scoreResults.recommendations || "Keep up the good work!",
//     };

//     // Save the report to the database
//     const report = await Report.create(newReport);

//     // Save assessment data (optional)
//     const assessmentData = new Assessment({
//       userId,
//       companyId,
//       answers: answerRecords.map((a) => a._id), // Save references to the answers
//       reportId: report._id, // Link to the created report
//     });
//     await assessmentData.save();

//     // Send email to user
//     sendEmailToUser(req.user.email, report);

//     res
//       .status(201)
//       .json({ message: "Assessment submitted successfully", report });
//   } catch (error) {
//     logger.error("Error submitting assessment:", error);
//     res
//       .status(500)
//       .json({ error: "Error submitting assessment: " + error.message });
//   }
// };

// // View responses for the logged-in user
// const viewResponses = async (req, res) => {
//   try {
//     const responses = await Answer.find({ user: req.user.id }).populate(
//       "question"
//     );
//     res.status(200).json(responses);
//   } catch (err) {
//     logger.error("Error fetching responses:", err);
//     res
//       .status(500)
//       .json({ error: "An error occurred while fetching responses" });
//   }
// };

// // Download forms as PDF
// const downloadForm = async (req, res) => {
//   const { userId } = req.params;
//   try {
//     const responses = await Answer.find({ user: userId }).populate("question");
//     const pdfBuffer = await createPdfFromResponses(responses);
//     res.set("Content-Type", "application/pdf");
//     res.set("Content-Disposition", `attachment; filename=form-${userId}.pdf`);
//     res.send(pdfBuffer);
//   } catch (err) {
//     logger.error("Error downloading form:", err);
//     res
//       .status(500)
//       .json({ error: "An error occurred while downloading the form" });
//   }
// };

// // Generate report functionality
// const generateReport = async (req, res) => {
//   const { userId } = req.params;

//   try {
//     const report = await Report.findOne({ user: userId }).populate("answers");
//     if (!report) return res.status(404).json({ error: "Report not found" });

//     const pdfBuffer = await createPdfFromReport(report);
//     res.set("Content-Type", "application/pdf");
//     res.set("Content-Disposition", `attachment; filename=report-${userId}.pdf`);
//     res.send(pdfBuffer);
//   } catch (err) {
//     logger.error("Error generating report:", err);
//     res
//       .status(500)
//       .json({ error: "An error occurred while generating the report" });
//   }
// };

// // Validation middleware for submitting the form
// const validateSubmitForm = [
//   body("answers").isArray().withMessage("Answers must be an array"),
//   body("answers.*.questionId")
//     .notEmpty()
//     .withMessage("Question ID is required"),
//   body("answers.*.response").notEmpty().withMessage("Response is required"),
//   (req, res, next) => {
//     const errors = validationResult(req);
//     if (!errors.isEmpty()) {
//       return res.status(400).json({ errors: errors.array() });
//     }
//     next();
//   },
// ];

// module.exports = {
//   submitAssessment,
//   submitForm,
//   viewResponses,  
//   downloadForm,
//   generateReport,
//   validateSubmitForm,
// };

// src/controllers/assessmentController.js
const Answer = require("../models/Answer");
const Question = require("../models/Question");
const Report = require("../models/Report");
const Assessment = require("../models/Assessment"); // Keeping this for tracking assessments
const {
  createPdfFromResponses,
  createPdfFromReport,
} = require("../utils/pdfGenerator");
const { sendEmailToUser } = require("../utils/email");
const { body, validationResult } = require("express-validator");
const logger = require("../utils/logger");
const calculateScores = require("../utils/scoreCalculator");
const db = require("../config/db"); // Database connection

const submitAssessment = async (req, res) => {
  const { slug } = req.params;
  const { employee_info, health_assessment } = req.body;
  console.log("Running submitAssessment function");
  console.log(employee_info);
  try {
    const query = `INSERT INTO \`assessment_response\` (company_slug ,employee_info, health_assessment) VALUES (?, ?, ?)`;

    // Await the result of the query
    const [result] = await db.query(query, [slug ,employee_info, health_assessment]);

    res.status(200).json({ message: "Success", result });
  } catch (err) {
    console.error("Database insertion error:", err); // Log error for debugging
    res.status(500).json({ message: "Error while entering form", err });
  }
};

// Function to submit a health assessment
const submitForm = async (req, res) => {
  try {
    const { answers, userId, companyId, bmi = 0 } = req.body;
    console.log(req.body);
    // Validate input
    if (!answers || !userId || !companyId) {
      return res.status(400).json({ error: "Answers are required" });
    }

    // Calculate the scores based on the answers
    const scoreResults = calculateScores(answers);

    // Fetch questions and validate answers
    const answerRecords = [];
    let totalScore = 0;

    for (const answerData of answers) {
      const { questionId, response } = answerData;
      const question = await Question.findById(questionId);

      if (!question) {
        logger.error(`Question not found: ${questionId}`);
        return res.status(400).json({ error: "Question not found" });
      }

      const answer = new Answer({
        user: userId,
        question: questionId,
        response,
      });
      await answer.save();
      answerRecords.push(answer);
      totalScore += question.scoring; // Adjust based on your scoring logic
    }

    // Create a report based on the calculated scores
    const newReport = {
      userId,
      companyId,
      healthRiskScore: scoreResults.totalScore,
      emotionalHealthScore: scoreResults.sectionScores.mentalEmotionalWellBeing,
      nutritionalHabitsScore: scoreResults.sectionScores.nutrition,
      bmi,
      prevalentRiskFactors: scoreResults.riskFactors || [],
      recommendations: scoreResults.recommendations || "Keep up the good work!",
    };

    // Save the report to the database
    const report = await Report.create(newReport);

    // Save assessment data (optional)
    const assessmentData = new Assessment({
      userId,
      companyId,
      answers: answerRecords.map((a) => a._id), // Save references to the answers
      reportId: report._id, // Link to the created report
    });
    await assessmentData.save();

    // Send email to user
    sendEmailToUser(req.user.email, report);

    res
      .status(201)
      .json({ message: "Assessment submitted successfully", report });
  } catch (error) {
    logger.error("Error submitting assessment:", error);
    res
      .status(500)
      .json({ error: "Error submitting assessment: " + error.message });
  }
};

// View responses for the logged-in user
const viewResponses = async (req, res) => {
  try {
    const responses = await Answer.find({ user: req.user.id }).populate(
      "question"
    );
    res.status(200).json(responses);
  } catch (err) {
    logger.error("Error fetching responses:", err);
    res
      .status(500)
      .json({ error: "An error occurred while fetching responses" });
  }
};

// Download forms as PDF
const downloadForm = async (req, res) => {
  const { userId } = req.params;
  try {
    const responses = await Answer.find({ user: userId }).populate("question");
    const pdfBuffer = await createPdfFromResponses(responses);
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename=form-${userId}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("Error downloading form:", err);
    res
      .status(500)
      .json({ error: "An error occurred while downloading the form" });
  }
};

// Generate report functionality
const generateReport = async (req, res) => {
  const { userId } = req.params;

  try {
    const report = await Report.findOne({ user: userId }).populate("answers");
    if (!report) return res.status(404).json({ error: "Report not found" });

    const pdfBuffer = await createPdfFromReport(report);
    res.set("Content-Type", "application/pdf");
    res.set("Content-Disposition", `attachment; filename=report-${userId}.pdf`);
    res.send(pdfBuffer);
  } catch (err) {
    logger.error("Error generating report:", err);
    res
      .status(500)
      .json({ error: "An error occurred while generating the report" });
  }
};

// Validation middleware for submitting the form
const validateSubmitForm = [
  body("answers").isArray().withMessage("Answers must be an array"),
  body("answers.*.questionId")
    .notEmpty()
    .withMessage("Question ID is required"),
  body("answers.*.response").notEmpty().withMessage("Response is required"),
  (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    next();
  },
];

module.exports = {
  submitAssessment,
  submitForm,
  viewResponses,
  downloadForm,
  generateReport,
  validateSubmitForm,
};
