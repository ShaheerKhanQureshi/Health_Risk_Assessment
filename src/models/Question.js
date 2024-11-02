const db = require('../config/db'); // Ensure this path points to the correct db.js file

const Question = {
    // Create a new question record
    create: async (data) => {
        const query = `
            INSERT INTO questions (text, type, scoring, category, isActive)
            VALUES (?, ?, ?, ?, ?)
        `;
        const values = [data.text, data.type, data.scoring, data.category, data.isActive];
        try {
            const [result] = await db.query(query, values);
            return { id: result.insertId, ...data }; // Return created question with ID
        } catch (error) {
            console.error('Error creating question:', error);
            throw new Error('Error creating question: ' + error.message);
        }
    },

    // Retrieve all questions
    findAll: async () => {
        const query = 'SELECT * FROM questions';
        try {
            const [results] = await db.query(query);
            return results; // Return all questions
        } catch (error) {
            console.error('Error retrieving questions:', error);
            throw new Error('Error retrieving questions: ' + error.message);
        }
    },

    // Retrieve a specific question by ID
    findById: async (id) => {
        const query = 'SELECT * FROM questions WHERE id = ?';
        try {
            const [results] = await db.query(query, [id]);
            return results[0]; // Return the question found
        } catch (error) {
            console.error('Error retrieving question:', error);
            throw new Error('Error retrieving question: ' + error.message);
        }
    },

    // Update a question
    update: async (id, data) => {
        const query = `
            UPDATE questions 
            SET text = ?, type = ?, scoring = ?, category = ?, isActive = ?
            WHERE id = ?
        `;
        const values = [data.text, data.type, data.scoring, data.category, data.isActive, id];
        try {
            await db.query(query, values);
            return { id, ...data }; // Return the updated question
        } catch (error) {
            console.error('Error updating question:', error);
            throw new Error('Error updating question: ' + error.message);
        }
    },

    // Delete a question
    delete: async (id) => {
        const query = 'DELETE FROM questions WHERE id = ?';
        try {
            await db.query(query, [id]);
            return { message: 'Question deleted successfully' }; // Confirmation message
        } catch (error) {
            console.error('Error deleting question:', error);
            throw new Error('Error deleting question: ' + error.message);
        }
    },

    // Optionally, you can define methods for more complex queries
};

module.exports = Question;
