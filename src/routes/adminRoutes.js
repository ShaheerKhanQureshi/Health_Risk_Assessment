const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');
const { body, validationResult } = require('express-validator');
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

// Get all admins and sub-admins
router.get('/', authenticate('admin'), async (req, res) => {
    try {
        const [results] = await db.query('SELECT id, first_name, last_name, email, role FROM users WHERE role IN ("admin", "sub-admin")');
        res.json({ success: true, admins: results });
    } catch (error) {
        console.error('Error retrieving admins:', error);
        res.status(500).json({ success: false, message: 'Error retrieving admins', error: error.message });
    }
});

// Create a new admin or sub-admin
router.post(
    '/',
    authenticate('admin'),
    [
        body('first_name').isString().notEmpty().withMessage('First name is required'),
        body('last_name').isString().notEmpty().withMessage('Last name is required'),
        body('email').isEmail().withMessage('Valid email is required').custom(async (value) => {
            const [results] = await db.query('SELECT * FROM users WHERE email = ?', [value]);
            if (results.length > 0) {
                return Promise.reject('Email already in use');
            }
        }),
        body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters long'),
        body('role').isIn(['admin', 'sub-admin']).withMessage('Role must be either admin or sub-admin'),
        body('gender').isString().notEmpty().withMessage('Gender is required'),
        body('date_of_birth').isDate().withMessage('Date of birth is required and must be a valid date'),
        body('designation').isString().notEmpty().withMessage('Designation is required')
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { first_name, last_name, email, password, role, gender, date_of_birth, designation } = req.body;

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                first_name,
                last_name,
                email,
                password: hashedPassword,
                role,
                gender,
                date_of_birth,
                designation
            };

            await db.query('INSERT INTO users SET ?', newUser);
            res.status(201).json({ success: true, message: 'Admin or sub-admin created successfully' });
        } catch (error) {
            console.error('Error during admin creation:', error);
            res.status(500).json({ success: false, message: 'Internal server error during admin creation', error: error.message });
        }
    }
);

// Update an existing admin or sub-admin
router.put('/:id', authenticate('admin'), async (req, res) => {
    const { id } = req.params;
    const { first_name, last_name, email, role, gender, date_of_birth, designation } = req.body;

    try {
        await db.query(
            'UPDATE users SET first_name = ?, last_name = ?, email = ?, role = ?, gender = ?, date_of_birth = ?, designation = ? WHERE id = ? AND role IN ("admin", "sub-admin")',
            [first_name, last_name, email, role, gender, date_of_birth, designation, id]
        );
        res.json({ success: true, message: 'Admin or sub-admin updated successfully' });
    } catch (error) {
        console.error('Error updating admin:', error);
        res.status(500).json({ success: false, message: 'Error updating admin', error: error.message });
    }
});

// Delete an admin or sub-admin
router.delete('/:id', authenticate('admin'), async (req, res) => {
    const { id } = req.params;

    try {
        const [results] = await db.query('DELETE FROM users WHERE id = ? AND role IN ("admin", "sub-admin")', [id]);
        if (results.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Admin or sub-admin not found' });
        }
        res.json({ success: true, message: 'Admin or sub-admin deleted successfully' });
    } catch (error) {
        console.error('Error deleting admin:', error);
        res.status(500).json({ success: false, message: 'Error deleting admin', error: error.message });
    }
});

module.exports = router;
