const express = require('express');
const { body, validationResult } = require('express-validator');
const bcrypt = require('bcryptjs');
const db = require('../config/db'); // Ensure this path is correct
const { authenticate } = require("../middlewares/auth");

const router = express.Router();

// Admin and Sub-admin Registration (accessible only by main admin)
router.post(
    '/createAdmin',
    authenticate('admin'), // Only main admins can create new admins or sub-admins
    [
        body('firstName').isString().notEmpty().withMessage('First name is required'),
        body('lastName').isString().notEmpty().withMessage('Last name is required'),
        body('dob').isISO8601().withMessage('Date of birth must be a valid date'),
        body('gender').isIn(['male', 'female', 'Other']).withMessage('Gender is required'),
        body('designation').isString().notEmpty().withMessage('Designation is required'),
        body('email')
            .isEmail().withMessage('Valid email is required')
            .custom(async (value) => {
                const [results] = await db.query('SELECT * FROM users WHERE email = ?', [value]);
                if (results.length > 0) {
                    return Promise.reject('Email already in use');
                }
            }),
        body('password')
            .isLength({ min: 6 }).withMessage('Password must be at least 6 characters long')
            .matches(/\d/).withMessage('Password must contain a number'),
        body('confirm_password')
            .custom((value, { req }) => value === req.body.password)
            .withMessage('Passwords do not match'),
        body('role').isIn(['admin', 'sub-admin']).withMessage('Role must be either admin or sub-admin'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { first_name, last_name, date_of_birth, gender, designation, email, password, role } = req.body;

        try {
            // Hash the password before storing
            const hashedPassword = await bcrypt.hash(password, 10);
            const newUser = {
                first_name,
                last_name,
                date_of_birth,
                gender,
                designation,
                email,
                password: hashedPassword,
                role
            };

            // Insert the new admin or sub-admin into the database
            await db.query('INSERT INTO users SET ?', newUser);
            res.status(201).json({ success: true, message: 'Admin or Sub-admin created successfully' });
        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({ success: false, message: 'Internal server error during admin creation' });
        }
    }
);
// // Edit user (only admins can access this)
// router.put(
//     '/edituser/:userId',
//     authenticate('admin'), 
//     [
//         body('firstName').optional().isString().notEmpty().withMessage('First name must be a valid string'),
//         body('lastName').optional().isString().notEmpty().withMessage('Last name must be a valid string'),
//         body('dob').optional().isISO8601().withMessage('Date of birth must be a valid date'),
//         body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be valid'),
//         body('designation').optional().isString().notEmpty().withMessage('Designation must be a valid string'),
//         body('email')
//             .optional()
//             .isEmail().withMessage('Valid email is required')
//             .custom(async (value, { req }) => {
//                 if (value) {
//                     const [results] = await db.query('SELECT * FROM users WHERE email = ? AND id != ?', [value, req.params.userId]);
//                     if (results.length > 0) {
//                         return Promise.reject('Email already in use');
//                     }
//                 }
//             }),
//         body('role')
//             .optional()
//             .isIn(['admin', 'sub-admin', 'user']).withMessage('Role must be one of admin, sub-admin, or user'),
//     ],
    // async (req, res) => {
    //     const errors = validationResult(req);
    //     if (!errors.isEmpty()) {
    //         return res.status(400).json({ success: false, errors: errors.array() });
    //     }

    //     const { firstName, lastName, dob, gender, designation, email, role } = req.body;
    //     const { userId } = req.params;

    //     try {
    //         const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

    //         if (user.length === 0) {
    //             return res.status(404).json({ success: false, message: 'User not found' });
    //         }

    //         const updatedUser = { 
    //             first_name: firstName, 
    //             last_name: lastName, 
    //             date_of_birth: dob, 
    //             gender, 
    //             designation, 
    //             email, 
    //             role 
    //         };

//             // Remove optional fields that are not provided
//             Object.keys(updatedUser).forEach(key => {
//                 if (!updatedUser[key]) {
//                     delete updatedUser[key];
//                 }
//             });

//             // Update the user in the database
//             await db.query('UPDATE users SET ? WHERE id = ?', [updatedUser, userId]);

//             res.status(200).json({ success: true, message: 'User updated successfully' });
//         } catch (error) {
//             console.error('Error updating user:', error);
//             res.status(500).json({ success: false, message: 'Internal server error during user update' });
//         }
//     }
// );

// // Delete user (only admins can access this)
// router.delete(
//     '/deleteuser/:Id',
//     authenticate('admin'), // Only admins can delete users
//     async (req, res) => {
//         const { userId } = req.params;

//         try {
//             const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

//             if (user.length === 0) {
//                 return res.status(404).json({ success: false, message: 'User not found' });
//             }

//             // Delete the user from the database
//             await db.query('DELETE FROM users WHERE id = ?', [userId]);

//             res.status(200).json({ success: true, message: 'User deleted successfully' });
//         } catch (error) {
//             console.error('Error deleting user:', error);
//             res.status(500).json({ success: false, message: 'Internal server error during user deletion' });
//         }
//     }
// );
// Edit user (only admins can access this)
router.put(
    '/users/edit/:userId',
    authenticate('admin'),  // Only admin can update users
    [
        body('firstName').optional().isString().notEmpty().withMessage('First name must be a valid string'),
        body('lastName').optional().isString().notEmpty().withMessage('Last name must be a valid string'),
        body('dob').optional().isISO8601().withMessage('Date of birth must be a valid date'),
        body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Gender must be valid'),
        body('designation').optional().isString().notEmpty().withMessage('Designation must be a valid string'),
        body('email')
            .optional()
            .isEmail().withMessage('Valid email is required')
            .custom(async (value, { req }) => {
                if (value) {
                    // Comment or remove this validation if you don't want email checks
                    const [results] = await db.query('SELECT * FROM users WHERE email = ? AND id != ?', [value, req.params.userId]);
                    if (results.length > 0) {
                        return Promise.reject('Email already in use');
                    }
                }
            }),
        body('role')
            .optional()
            .isIn(['admin', 'sub-admin', 'user']).withMessage('Role must be one of admin, sub-admin, or user'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { firstName, lastName, dob, gender, designation, email, role, password } = req.body;
        const { userId } = req.params;

        try {
            // Skip the user existence check
            const updatedUser = { 
                first_name: firstName, 
                last_name: lastName, 
                date_of_birth: dob, 
                gender, 
                designation, 
                email, 
                role 
            };

            // Only include password if provided
            if (password) {
                updatedUser.password = await bcrypt.hash(password, 10);
            }

            // Remove optional fields that are not provided
            Object.keys(updatedUser).forEach(key => {
                if (!updatedUser[key]) {
                    delete updatedUser[key];
                }
            });

            // Directly update the user (without checking if the user exists)
            await db.query('UPDATE users SET ? WHERE id = ?', [updatedUser, userId]);

            res.status(200).json({ success: true, message: 'User updated successfully' });
        } catch (error) {
            console.error('Error updating user:', error);
            res.status(500).json({ success: false, message: 'Internal server error during user update' });
        }
    }
);

// Delete user (only admins can access this)
router.delete(
    '/users/delete/:userId',
    authenticate('admin'), // Only admins can delete users
    async (req, res) => {
        const { userId } = req.params;

        try {
            const [user] = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

            if (user.length === 0) {
                return res.status(404).json({ success: false, message: 'User not found' });
            }

            // Delete the user from the database
            await db.query('DELETE FROM users WHERE id = ?', [userId]);

            res.status(200).json({ success: true, message: 'User deleted successfully' });
        } catch (error) {
            console.error('Error deleting user:', error);
            res.status(500).json({ success: false, message: 'Internal server error during user deletion' });
        }
    }
);

router.post(
    '/login',
    [
        body('email').isEmail().withMessage('Valid email is required'),
        body('password').notEmpty().withMessage('Password is required'),
    ],
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { email, password } = req.body;

        try {
            // Fetch user data from the database
            const [results] = await db.query(
                'SELECT id, first_name, last_name, email, role FROM users WHERE email = ?',
                [email]
            );

            // console.log('Database query result:', results);

            if (results.length === 0) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const user = results[0];
            // console.log('User data:', user);

            if (!['admin', 'sub-admin'].includes(user.role)) {
                return res.status(403).json({ success: false, message: 'Access denied' });
            }

            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(401).json({ success: false, message: 'Invalid credentials' });
            }

            const token = jwt.sign(
                { id: user.id, role: user.role },
                process.env.JWT_SECRET,
                { expiresIn: '5h' }
            );

            // Log the response structure before sending it
            console.log({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role
                }
            });

            // Send the response
            res.json({
                success: true,
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    first_name: user.first_name,
                    last_name: user.last_name,
                    role: user.role
                }
            });
        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({ success: false, message: 'Internal server error during login' });
        }
    }
);

// Constants for user roles
const roles = {
    ADMIN: 'admin',
    SUB_ADMIN: 'sub-admin',
};

// Get all admins and sub-admins (for user management page)
router.get('/allAdmins', authenticate(roles.ADMIN), async (req, res) => {
    try {
        const [results] = await db.query('SELECT id, first_name, last_name, email, role FROM users WHERE role IN (?, ?)', [roles.ADMIN, roles.SUB_ADMIN]);
        res.json({ success: true, users: results });
    } catch (error) {
        console.error('Error retrieving admins:', error);
        res.status(500).json({ success: false, message: 'Error retrieving admins', error: error.message });
    }
});

// Get all users
router.get('/allUsers', async (req, res) => {
    try {
        const [results] = await db.query('SELECT id, first_name, last_name, email, role FROM users');
        res.json({ success: true, users: results });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ success: false, message: 'Error fetching users', error: error.message });
    }
});
module.exports = router;
