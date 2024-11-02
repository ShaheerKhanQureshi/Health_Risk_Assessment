const db = require('../config/db'); // Ensure this path points to the correct db.js file
const logger = require('../utils/logger'); // Assuming you have a logger utility

const Assessment = {
    // Create a new assessment record
    create: async (data) => {
        const query = `
            INSERT INTO assessments (
                user_id, 
                health_risk_score, 
                emotional_health_score, 
                nutritional_habits_score, 
                bmi, 
                prevalent_risk_factors, 
                comments, 
                created_at, 
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
        `;
        const values = [
            data.user_id, 
            data.health_risk_score, 
            data.emotional_health_score, 
            data.nutritional_habits_score, 
            data.bmi, 
            data.prevalent_risk_factors.join(','), 
            data.comments
        ];

        try {
            const [results] = await db.query(query, values);
            return { id: results.insertId, ...data }; // Return the ID of the newly created assessment
        } catch (error) {
            logger.error('Error creating assessment:', error);
            throw new Error('Error creating assessment: ' + error.message);
        }
    },

    // Get assessments for a specific user
    getByUserId: async (userId) => {
        const query = `
            SELECT a.*, u.name AS user_name 
            FROM assessments a
            JOIN users u ON a.user_id = u.id
            WHERE a.user_id = ?
        `;
        try {
            const [results] = await db.query(query, [userId]);
            return results;
        } catch (error) {
            logger.error('Error retrieving assessments for user:', error);
            throw new Error('Error retrieving assessments: ' + error.message);
        }
    },

    // Get all assessments with user information
    getAll: async () => {
        const query = `
            SELECT a.*, u.name AS user_name 
            FROM assessments a
            JOIN users u ON a.user_id = u.id
        `;
        try {
            const [results] = await db.query(query);
            return results;
        } catch (error) {
            logger.error('Error retrieving all assessments:', error);
            throw new Error('Error retrieving assessments: ' + error.message);
        }
    },

    // Update an existing assessment
    update: async (id, data) => {
        const query = `
            UPDATE assessments 
            SET 
                health_risk_score = ?, 
                emotional_health_score = ?, 
                nutritional_habits_score = ?, 
                bmi = ?, 
                prevalent_risk_factors = ?, 
                comments = ?, 
                updated_at = NOW()
            WHERE id = ?
        `;
        const values = [
            data.health_risk_score, 
            data.emotional_health_score, 
            data.nutritional_habits_score, 
            data.bmi, 
            data.prevalent_risk_factors.join(','), 
            data.comments, 
            id
        ];

        try {
            const [results] = await db.query(query, values);
            return { affectedRows: results.affectedRows }; // Return number of affected rows
        } catch (error) {
            logger.error('Error updating assessment:', error);
            throw new Error('Error updating assessment: ' + error.message);
        }
    },

    // Delete an assessment
    delete: async (id) => {
        const query = 'DELETE FROM assessments WHERE id = ?';
        try {
            const [results] = await db.query(query, [id]);
            return { affectedRows: results.affectedRows }; // Return number of affected rows
        } catch (error) {
            logger.error('Error deleting assessment:', error);
            throw new Error('Error deleting assessment: ' + error.message);
        }
    },

    // Get collective reports for analysis
    getCollectiveReport: async () => {
        const query = `
            SELECT 
                AVG(health_risk_score) AS avg_health_risk, 
                AVG(emotional_health_score) AS avg_emotional_health, 
                AVG(nutritional_habits_score) AS avg_nutritional_habits,
                COUNT(*) AS total_assessments 
            FROM assessments
        `;
        try {
            const [results] = await db.query(query);
            return results[0];
        } catch (error) {
            logger.error('Error retrieving collective report:', error);
            throw new Error('Error retrieving collective report: ' + error.message);
        }
    }
};

module.exports = Assessment;
