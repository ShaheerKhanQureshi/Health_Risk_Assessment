// src/controllers/assessmentController.js
const Assessment = require('../models/Assessment');
const Answer = require('../models/Answer');
const Question = require('../models/Question');
const Report = require('../models/Report');
const { createPdfFromResponses, createPdfFromReport } = require('../utils/pdfGenerator');
const { sendEmailToUser } = require('../utils/email');
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');
const calculateRisk = require('../utils/calculateRisk'); // Ensure this function is defined

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
