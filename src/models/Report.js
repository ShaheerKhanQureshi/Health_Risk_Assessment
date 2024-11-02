const db = require('../config/db');

// Define the Report model with custom methods for CRUD operations
const Report = {
    // Create a new report
    create: async (data) => {
        const {
            userId,
            companyId,
            healthRiskScore,
            emotionalHealthScore,
            nutritionalHabitsScore,
            bmi,
            prevalentRiskFactors,
            recommendations
        } = data;

        const query = `
            INSERT INTO reports (
                user_id, company_id, health_risk_score, emotional_health_score, nutritional_habits_score, bmi, prevalent_risk_factors, recommendations
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            userId,
            companyId,
            healthRiskScore,
            emotionalHealthScore,
            nutritionalHabitsScore,
            bmi,
            JSON.stringify(prevalentRiskFactors), // Store as a JSON string
            recommendations
        ];

        try {
            const [result] = await db.query(query, values);
            return { id: result.insertId, ...data }; // Return the created report with its ID
        } catch (error) {
            console.error('Error creating report:', error);
            throw new Error('Error creating report: ' + error.message);
        }
    },

    // Retrieve a report by ID
    findById: async (id) => {
        const query = 'SELECT * FROM reports WHERE id = ?';
        try {
            const [results] = await db.query(query, [id]);
            return results[0]; // Return the found report or undefined
        } catch (error) {
            console.error('Error retrieving report by ID:', error);
            throw new Error('Error retrieving report: ' + error.message);
        }
    },

    // Retrieve all reports for a specific company
    findByCompanyId: async (companyId) => {
        const query = 'SELECT * FROM reports WHERE company_id = ?';
        try {
            const [results] = await db.query(query, [companyId]);
            return results; // Return all reports for the given company
        } catch (error) {
            console.error('Error retrieving reports by company ID:', error);
            throw new Error('Error retrieving reports: ' + error.message);
        }
    },

    // Update a report
    update: async (id, data) => {
        const {
            healthRiskScore,
            emotionalHealthScore,
            nutritionalHabitsScore,
            bmi,
            prevalentRiskFactors,
            recommendations
        } = data;

        const query = `
            UPDATE reports
            SET 
                health_risk_score = ?, 
                emotional_health_score = ?, 
                nutritional_habits_score = ?, 
                bmi = ?, 
                prevalent_risk_factors = ?, 
                recommendations = ?
            WHERE id = ?
        `;
        
        const values = [
            healthRiskScore,
            emotionalHealthScore,
            nutritionalHabitsScore,
            bmi,
            JSON.stringify(prevalentRiskFactors), // Store as a JSON string
            recommendations,
            id
        ];

        try {
            await db.query(query, values);
            return { id, ...data }; // Return the updated report info
        } catch (error) {
            console.error('Error updating report:', error);
            throw new Error('Error updating report: ' + error.message);
        }
    },

    // Delete a report
    delete: async (id) => {
        const query = 'DELETE FROM reports WHERE id = ?';
        try {
            await db.query(query, [id]);
            return { message: 'Report deleted successfully' };
        } catch (error) {
            console.error('Error deleting report:', error);
            throw new Error('Error deleting report: ' + error.message);
        }
    }
};

module.exports = Report;
