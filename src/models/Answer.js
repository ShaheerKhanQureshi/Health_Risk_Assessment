const db = require('../config/db'); // Ensure this path points to the correct db.js file
const logger = require('../utils/logger'); // Assuming a logging utility is available

const Answer = {
    // Create a new answer record
    create: async (data) => {
        const query = `INSERT INTO answers (user_id, question_id, score, riskCategory) VALUES (?, ?, ?, ?)`;
        const values = [data.user_id, data.question_id, data.score, data.riskCategory];
        try {
            const [result] = await db.query(query, values);
            return { id: result.insertId, ...data }; // Return created answer with ID
        } catch (error) {
            logger.error('Error creating answer:', error);
            throw new Error('Error creating answer: ' + error.message);
        }
    },

    // Retrieve all answers by user ID
    findAllByUser: async (userId) => {
        const query = `SELECT * FROM answers WHERE user_id = ?`;
        try {
            const [results] = await db.query(query, [userId]);
            return results; // Return all answers for the specified user
        } catch (error) {
            logger.error('Error retrieving answers for user:', error);
            throw new Error('Error retrieving answers for user: ' + error.message);
        }
    },

    // Retrieve all answers for a specific assessment (if applicable)
    findAllByAssessment: async (assessmentId) => {
        const query = `SELECT * FROM answers WHERE assessment_id = ?`;
        try {
            const [results] = await db.query(query, [assessmentId]);
            return results; // Return all answers for the specified assessment
        } catch (error) {
            logger.error('Error retrieving answers for assessment:', error);
            throw new Error('Error retrieving answers for assessment: ' + error.message);
        }
    },

    // Update an answer
    update: async (id, data) => {
        const query = `UPDATE answers SET score = ?, riskCategory = ? WHERE id = ?`;
        const values = [data.score, data.riskCategory, id];
        try {
            const [result] = await db.query(query, values);
            return { affectedRows: result.affectedRows }; // Return the result of the update operation
        } catch (error) {
            logger.error('Error updating answer:', error);
            throw new Error('Error updating answer: ' + error.message);
        }
    },

    // Delete an answer
    delete: async (id) => {
        const query = `DELETE FROM answers WHERE id = ?`;
        try {
            const [result] = await db.query(query, [id]);
            return { affectedRows: result.affectedRows }; // Return the result of the delete operation
        } catch (error) {
            logger.error('Error deleting answer:', error);
            throw new Error('Error deleting answer: ' + error.message);
        }
    },
};

module.exports = Answer;
