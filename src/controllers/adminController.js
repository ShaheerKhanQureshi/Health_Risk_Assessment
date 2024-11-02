const db = require('../config/db');
const winston = require('winston'); // Ensure winston is installed and configured


exports.addCompany = async (companyData) => {
    const { name, address, email, city, company_type } = companyData;

    const [result] = await db.query(
        "INSERT INTO companies (name, address, email, city, company_type) VALUES (?, ?, ?, ?, ?)",
        [name, address, email, city, company_type]
    );

    return result.insertId; // Return the new company's ID
};

// Function to create a new question
const createQuestion = async (data) => {
    try {
        // Validate input
        if (!data.text || !data.type || !data.category) {
            throw new Error("Missing required fields: text, type, or category.");
        }

        const query = 'INSERT INTO questions (text, type, scoring, category) VALUES (?, ?, ?, ?)';
        const values = [data.text, data.type, data.scoring || 0, data.category];
        const [result] = await db.query(query, values);
        winston.info(`Question created with ID: ${result.insertId}`);
        return { id: result.insertId, ...data };
    } catch (error) {
        winston.error("Error creating question:", error);
        throw error; // Rethrow error after logging
    }
};

// Function to update an existing question
const updateQuestion = async (id, data) => {
    try {
        // Validate input
        if (!data.text || !data.type || !data.category) {
            throw new Error("Missing required fields: text, type, or category.");
        }

        const query = 'UPDATE questions SET text = ?, type = ?, scoring = ?, category = ? WHERE id = ?';
        const values = [data.text, data.type, data.scoring || 0, data.category, id];
        await db.query(query, values);
        winston.info(`Question updated with ID: ${id}`);
        return { id, ...data };
    } catch (error) {
        winston.error("Error updating question:", error);
        throw error;
    }
};

// Function to retrieve all questions
const getQuestions = async () => {
    try {
        const query = 'SELECT * FROM questions';
        const [results] = await db.query(query);
        return results;
    } catch (error) {
        winston.error("Error fetching questions:", error);
        throw error;
    }
};

// Function to delete a question by ID
const deleteQuestion = async (id) => {
    try {
        const query = 'DELETE FROM questions WHERE id = ?';
        const [result] = await db.query(query, [id]);
        const deleted = result.affectedRows > 0;
        winston.info(`Question ${deleted ? 'deleted' : 'not found'} with ID: ${id}`);
        return deleted;
    } catch (error) {
        winston.error("Error deleting question:", error);
        throw error;
    }
};

module.exports = {
    createQuestion,
    updateQuestion,
    getQuestions,
    deleteQuestion,
};
