// src/controllers/userController.js
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // Assuming you're using a SQL database
const { body, validationResult } = require('express-validator');
const logger = require('../utils/logger');

// Middleware to validate user creation by admin
exports.validateCreateUser = [
    body('name').notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('role').isIn(['sub-admin', 'employee']).withMessage('Role must be either sub-admin or employee'),
    (req, res, next) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        next();
    },
];

// Admin creates a new user (sub-admin or employee)
exports.createUser = async (req, res) => {
    const { name, password, email, role } = req.body;

    try {
        const [existingUser] = await db.query('SELECT * FROM users WHERE email = ?', [email]);

        if (existingUser.length > 0) {
            return res.status(409).json({ error: 'User already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            name,
            password: hashedPassword,
            email,
            role,
            isEmailVerified: true, // Automatically verify since admin creates the user
        };

        const [result] = await db.query('INSERT INTO users SET ?', newUser);
        newUser.id = result.insertId; // Get the new user's ID

        // Optionally send an email notification to the new user
        await sendRegistrationEmail(newUser.email, newUser.name);

        res.status(201).json({
            message: 'User created successfully.',
            userId: newUser.id,
        });
    } catch (error) {
        logger.error('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user', details: error.message });
    }
};

// Function to handle form submission by employees
exports.submitForm = async (req, res) => {
    const { answers } = req.body; // Assuming answers are sent in the request body

    if (!answers || !Array.isArray(answers) || answers.length === 0) {
        return res.status(400).json({ error: 'Answers are required' });
    }

    let totalScore = 0;
    const answerRecords = [];

    try {
        for (const answerData of answers) {
            const { questionId, response } = answerData;
            const question = await db.query('SELECT * FROM questions WHERE id = ?', [questionId]);

            if (!question.length) {
                logger.error(`Question not found: ${questionId}`);
                return res.status(400).json({ error: 'Question not found' });
            }

            const answer = {
                userId: req.user.id, // Assume user ID is passed with the request context
                questionId,
                response,
                score: question[0].scoring, // Assuming scoring is a field in the questions table
            };

            totalScore += answer.score;
            answerRecords.push(answer);
        }

        // Save answers to the database (pseudo-code, adjust as necessary)
        await db.query('INSERT INTO answers (userId, questionId, response, score) VALUES ?', [answerRecords]);

        res.status(200).json({ message: 'Form submitted successfully', totalScore });
    } catch (error) {
        logger.error('Error submitting form:', error);
        res.status(500).json({ error: 'An error occurred while processing the form' });
    }
};
