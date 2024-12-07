const express = require("express");
const db = require("../config/db");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { body, validationResult } = require('express-validator');
const Joi = require('joi');
const { authenticate } = require('../middlewares/auth');

const router = express.Router();

// User Creation Schema
const userCreationSchema = Joi.object({
    firstName: Joi.string().required(),
    lastName: Joi.string().required(),
    dateOfBirth: Joi.date().required(),
    gender: Joi.string().valid('Male', 'Female', 'Other').required(),
    designation: Joi.string().required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    role: Joi.string().valid('admin', 'sub-admin').required(), 
});

// Registration Route
router.post('/register', [
    body('name').isString().notEmpty().withMessage('Name is required'),
    body('email').isEmail().withMessage('Valid email is required').custom(async (value) => {
        const results = await db.query('SELECT * FROM users WHERE email = ?', [value]);
        if (results.length > 0) {
            return Promise.reject('Email already in use');
        }
    }),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
    body('company').optional().isString(),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    try {
        const { name, email, password, company } = req.body;
        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = { name, email, password: hashedPassword, company };
        await db.query('INSERT INTO users SET ?', newUser);
        res.status(201).json({ message: 'User registered successfully' });
    } catch (error) {
        res.status(500).json({ error: 'Error registering user: ' + error.message });
    }
});

// Login Route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    try {
        const [results] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        if (results.length === 0) {
            return res.status(404).json({ message: 'Invalid credentials' });
        }

        const user = results[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials' });
        }

        // Generate JWT token with user id, role, and email
        const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '5h' });

        // Return the login response with the token, email, and role
        res.json({
            message: 'Login successful',
            token,
            email: user.email,  // Return the user's email
            role: user.role     // Return the user's role
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// Password Reset Request
router.post('/password-reset', [
    body('email').isEmail().withMessage('Valid email is required'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { email } = req.body;
    const token = crypto.randomBytes(20).toString('hex');

    try {
        await db.query('UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?', [token, Date.now() + 3600000, email]);
        const resetLink = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;
        await sendPasswordResetEmail(email, resetLink);
        res.json({ message: 'Password reset link sent' });
    } catch (error) {
        console.error('Error sending password reset email:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Reset Password
router.post('/reset-password', [
    body('token').notEmpty().withMessage('Token is required'),
    body('newPassword').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    const { token, newPassword } = req.body;

    try {
        const [results] = await db.query('SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?', [token, Date.now()]);
        
        if (results.length === 0) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await db.query('UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?', [hashedPassword, results[0].id]);

        res.json({ message: 'Password has been reset' });
    } catch (error) {
        console.error('Error resetting password:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Admin and Sub-Admin Creation
router.post("/createAdmin", async (req, res) => {
    const { error } = userCreationSchema.validate(req.body);
    if (error) {
        return res.status(400).json({ success: false, message: error.details[0].message });
    }

    const { firstName, lastName, dateOfBirth, gender, designation, email, password, role } = req.body;

    try {
        const [results] = await db.query("SELECT * FROM users WHERE email = ?", [email]);
        if (results.length > 0) {
            return res.status(409).json({ success: false, message: "User already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            first_name: firstName,
            last_name: lastName,
            date_of_birth: dateOfBirth,
            gender,
            designation,
            email,
            password: hashedPassword,
            role
        };

        await db.query("INSERT INTO users SET ?", newUser);
        res.status(201).json({ success: true, message: "User created successfully" });
    } catch (error) {
        console.error('Error during admin creation:', error);
        res.status(500).json({ success: false, error: "Internal server error during admin creation" });
    }
});

// Get all admins and sub-admins
router.get('/all', authenticate(), async (req, res) => {
    try {
        const [results] = await db.query('SELECT * FROM users WHERE role IN ("admin", "sub-admin")');
        res.status(200).json(results);
    } catch (error) {
        console.error('Error retrieving admins:', error);
        res.status(500).json({ message: 'Error retrieving admins', error: error.message });
    }
});

module.exports = router;
