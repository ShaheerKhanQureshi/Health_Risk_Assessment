const db = require('../config/db'); // Database configuration
const bcrypt = require('bcryptjs'); // For password hashing

const User = {
    // Create a new user (admin or sub-admin)
    create: async (data) => {
        const { firstName, lastName, email, password, date_of_birth, gender, designation, role = 'employee' } = data;
        const hashedPassword = await bcrypt.hash(password, 10);
        const query = `
            INSERT INTO users (firstName, lastName, email, password, dob, gender, designation, role)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        const values = [
            firstName,
            lastName,
            email.toLowerCase(),
            hashedPassword,
            date_of_birth,
            gender,
            designation,
            role
        ];

        try {
            const [result] = await db.query(query, values);
            return { id: result.insertId, ...data }; // Return created user with ID
        } catch (error) {
            console.error('Error creating user:', error);
            throw new Error('Error creating user: ' + error.message);
        }
    },

    // Find a user by email
    findByEmail: async (email) => {
        const query = 'SELECT * FROM users WHERE email = ?';
        try {
            const [results] = await db.query(query, [email.toLowerCase()]);
            return results[0]; // Return the found user or undefined
        } catch (error) {
            console.error('Error retrieving user by email:', error);
            throw new Error('Error retrieving user: ' + error.message);
        }
    },

    // Get user by ID
    findById: async (id) => {
        const query = 'SELECT * FROM users WHERE id = ?';
        try {
            const [results] = await db.query(query, [id]);
            return results[0]; // Return the found user or undefined
        } catch (error) {
            console.error('Error retrieving user by ID:', error);
            throw new Error('Error retrieving user: ' + error.message);
        }
    },

    // Update a user
    update: async (id, data) => {
        const { firstName, lastName, email, password, date_of_birth, gender, designation, role } = data;
        let query = `
            UPDATE users 
            SET firstName = ?, lastName = ?, email = ?, dob = ?, gender = ?, designation = ?, role = ?
            WHERE id = ?
        `;
        const values = [
            firstName,
            lastName,
            email.toLowerCase(),
            date_of_birth,
            gender,
            designation,
            role,
            id
        ];

        // Add password update if provided
        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            query = `
                UPDATE users 
                SET firstName = ?, lastName = ?, email = ?, dob = ?, gender = ?, designation = ?, role = ?, password = ?
                WHERE id = ?
            `;
            values.unshift(hashedPassword); // Insert hashed password at the beginning
            values.push(id); // Ensure the ID is the last value
        }

        try {
            await db.query(query, values);
            return { id, ...data }; // Return updated user info
        } catch (error) {
            console.error('Error updating user:', error);
            throw new Error('Error updating user: ' + error.message);
        }
    },

    // Get all users
    getAll: async () => {
        const query = 'SELECT * FROM users';
        try {
            const [results] = await db.query(query);
            return results; // Return all users
        } catch (error) {
            console.error('Error retrieving all users:', error);
            throw new Error('Error retrieving users: ' + error.message);
        }
    },

    // Delete a user
    delete: async (id) => {
        const query = 'DELETE FROM users WHERE id = ?';
        try {
            await db.query(query, [id]);
            return { message: 'User deleted successfully' }; // Confirmation message
        } catch (error) {
            console.error('Error deleting user:', error);
            throw new Error('Error deleting user: ' + error.message);
        }
    },
};

module.exports = User; // Export the User model
