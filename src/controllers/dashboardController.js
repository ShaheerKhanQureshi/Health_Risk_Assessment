const Report = require('../models/Report');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const db = require('../config/db');

// View responses for the logged-in user
exports.viewResponses = async (req, res) => {
    try {
        const responses = await Answer.find({ user: req.user.id }).populate('question');
        res.status(200).json(responses);
    } catch (err) {
        logger.error('Error fetching responses:', err);
        res.status(500).json({ error: 'An error occurred while fetching responses' });
    }
};

// Download forms as PDF
exports.downloadForm = async (req, res) => {
    const { userId } = req.params;
    try {
        const responses = await Answer.find({ user: userId }).populate('question');
        const pdfBuffer = await createPdfFromResponses(responses);
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `attachment; filename=form-${userId}.pdf`);
        res.send(pdfBuffer);
    } catch (err) {
        logger.error('Error downloading form:', err);
        res.status(500).json({ error: 'An error occurred while downloading the form' });
    }
};

// Submit health assessment form
exports.submitForm = async (req, res) => {
    const { answers } = req.body;

    // Validate answers input
    if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: 'Answers are required' });
    }

    let totalScore = 0;
    const answerRecords = [];

    try {
        for (const answerData of answers) {
            const { questionId, response } = answerData;
            const question = await Question.findById(questionId);

            if (!question) {
                logger.error(`Question not found: ${questionId}`);
                return res.status(400).json({ error: 'Question not found' });
            }

            const answer = new Answer({ user: req.user.id, question: questionId, response });
            await answer.save();
            answerRecords.push(answer);
            totalScore += question.scoring; // Adjust based on your scoring logic
        }

        const healthRiskScore = calculateRisk(totalScore); // Calculate risk based on totalScore
        const report = new Report({ user: req.user.id, healthRiskScore, answers: answerRecords });
        await report.save();

        // Optionally save assessment data here if needed
        // const assessment = new Assessment({ userId: req.user.id, reportId: report._id });
        // await assessment.save();

        // Send email to user
        sendEmailToUser(req.user.email, report);

        res.status(200).json({ reportId: report.id, answers: answerRecords });
    } catch (err) {
        logger.error('Error processing form submission:', err);
        res.status(500).json({ error: 'An error occurred while processing the form' });
    }
};

// Validation middleware for submitting the form
exports.validateSubmitForm = [
    body('answers').isArray().withMessage('Answers must be an array'),
    body('answers.*.questionId').notEmpty().withMessage('Question ID is required'),
    body('answers.*.response').notEmpty().withMessage('Response is required'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Generate report functionality
exports.generateReport = async (req, res) => {
    const { userId } = req.params;

    try {
        const report = await Report.findOne({ user: userId }).populate('answers');
        if (!report) return res.status(404).json({ error: 'Report not found' });

        const pdfBuffer = await createPdfFromReport(report); // Generate PDF report
        res.set('Content-Type', 'application/pdf');
        res.set('Content-Disposition', `attachment; filename=report-${userId}.pdf`);
        res.send(pdfBuffer);
    } catch (err) {
        logger.error('Error generating report:', err);
        res.status(500).json({ error: 'An error occurred while generating the report' });
    }
};

//dashboard grapghs and logs
// exports.getTotalUsers = (req, res) => {
//     connection.query("SELECT employee_info FROM assessment_response", (err, results) => {
//       if (err) throw err;
//       const totalUsers = results.length;
//       res.json({ totalUsers });
//     });
//   };
  
//   exports.getTotalCompanies = (req, res) => {
//     connection.query("SELECT COUNT(*) AS totalCompanies FROM companies", (err, results) => {
//       if (err) throw err;
//       res.json(results[0]);
//     });
//   };
  
//   exports.getSessionByCompany = (req, res) => {
//     connection.query(`
//       SELECT company_slug, COUNT(*) AS sessions, AVG(health_assessment) AS averageScore
//       FROM assessment_response
//       GROUP BY company_slug
//     `, (err, results) => {
//       if (err) throw err;
//       res.json(results);
//     });
//   };
  
//   exports.getUserLogs = (req, res) => {
//     connection.query("SELECT name, role, status, created_at FROM user", (err, results) => {
//       if (err) throw err;
//       res.json(results);
//     });
//   };
  
//   exports.getPerformanceMetrics = (req, res) => {
//     connection.query(`
//       SELECT company_slug, COUNT(*) AS count
//       FROM assessment_response
//       GROUP BY company_slug
//     `, (err, results) => {
//       if (err) throw err;
//       res.json(results);
//     });
//   };
exports.getTotalUsers = async (req, res) => {
    try {
        const [results] = await db.query("SELECT employee_info FROM assessment_response");

        // Decode JSON strings and extract relevant information
        const totalUsers = results.length; // Count of records
        const users = results.map(row => {
            try {
                return JSON.parse(row.employee_info); // Decode JSON
            } catch (error) {
                console.error('Error parsing JSON:', error);
                return null; // Handle parsing error (e.g., return null or default value)
            }
        }).filter(user => user !== null); // Filter out any null values

        res.json({ totalUsers, users }); // Return total users count and decoded user data
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};

exports.getTotalCompanies = async (req, res) => {
    try {
        const [results] = await db.query("SELECT COUNT(*) AS totalCompanies FROM companies");
        res.json(results[0]);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};

// exports.getSessionByCompany = async (req, res) => {
//     try {
//         const [results] = await db.query(`
//             SELECT company_slug, COUNT(*) AS sessions, AVG(health_assessment) AS averageScore
//             FROM assessment_response
//             GROUP BY company_slug
//         `);
//         res.json(results);
//     } catch (err) {
//         console.error(err);
//         res.status(500).json({ message: "Database query failed" });
//     }
// };
exports.getSessionByCompany = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT company_slug, COUNT(*) AS sessions, AVG(health_assessment) AS averageScore
            FROM assessment_response
            GROUP BY company_slug
            ORDER BY sessions DESC
            LIMIT 5
        `);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};

exports.getUserLogs = async (req, res) => {
    try {
        const [results] = await db.query("SELECT first_name, role, designation, gender, created_at FROM users ORDER BY created_at DESC");
        console.log("🚀 ~ exports.getUserLogs= ~ results:", results);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};


exports.getPerformanceMetrics = async (req, res) => {
    try {
        const [results] = await db.query(`
            SELECT company_slug, COUNT(*) AS count
            FROM assessment_response
            GROUP BY company_slug
        `);
        res.json(results);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Database query failed" });
    }
};