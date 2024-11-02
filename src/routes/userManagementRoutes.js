// const express = require('express');
// const db = require('../config/db'); 
// const bcrypt = require('bcryptjs');
// const authenticate = require('../middlewares/auth');
// const { body, validationResult } = require('express-validator');

// const router = express.Router();

// // Get all users
// router.get('/', authenticate('admin'), async (req, res) => {
//     try {
//         const [results] = await db.query('SELECT * FROM users');
//         res.json({ success: true, data: results });
//     } catch (err) {
//         res.status(500).json({ success: false, message: 'Internal server error', error: err.message });
//     }
// });

// // Create a new user
// router.post(
//     '/',
//     authenticate('admin'),
//     [
//         body('username').isString().notEmpty().withMessage('Username is required'),
//         body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
//         body('email').isEmail().withMessage('Valid email is required'),
//         body('role').isIn(['admin', 'user']).withMessage('Role must be either admin or user'),
//         body('gender').optional().isString().isIn(['male', 'female', 'other']),
//     ],
//     async (req, res) => {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ success: false, errors: errors.array() });
//         }

//         const { username, password, role, email, gender } = req.body;
//         const hashedPassword = await bcrypt.hash(password, 10);

//         try {
//             await db.query('INSERT INTO users (username, password, role, email, gender) VALUES (?, ?, ?, ?, ?)', 
//                 [username, hashedPassword, role, email, gender]);
//             res.status(201).json({ success: true, message: 'User created successfully' });
//         } catch (err) {
//             res.status(500).json({ success: false, message: 'Failed to create user', error: err.message });
//         }
//     }
// );

// // Update user status
// router.put(
//     '/:id/status',
//     authenticate('admin'),
//     [
//         body('status').isString().notEmpty().withMessage('Status is required'),
//         body('status').isIn(['active', 'inactive']).withMessage('Status must be either active or inactive'), // Example statuses
//     ],
//     async (req, res) => {
//         const errors = validationResult(req);
//         if (!errors.isEmpty()) {
//             return res.status(400).json({ success: false, errors: errors.array() });
//         }

//         const { status } = req.body;
//         try {
//             const result = await db.query('UPDATE users SET status = ? WHERE id = ?', [status, req.params.id]);
//             if (result.affectedRows === 0) {
//                 return res.status(404).json({ success: false, message: 'User not found' });
//             }
//             res.json({ success: true, message: 'User status updated successfully' });
//         } catch (err) {
//             res.status(500).json({ success: false, message: 'Failed to update user status', error: err.message });
//         }
//     }
// );

// module.exports = router;
