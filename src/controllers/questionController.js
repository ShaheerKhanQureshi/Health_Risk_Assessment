// src/controllers/questionController.js
const Question = require('../models/Question');
const logger = require('../utils/logger'); // Use a logging utility

// Fetch all active questions
exports.getAllActiveQuestions = async (req, res) => {
    try {
        const questions = await Question.findAll({
            where: { isActive: true },
        });
        res.status(200).json(questions);
    } catch (error) {
        logger.error('Error fetching questions:', error); // Use logger instead
        res.status(500).json({ error: 'Failed to fetch questions', details: error.message });
    }
};
