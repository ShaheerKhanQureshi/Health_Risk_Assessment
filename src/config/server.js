// src/config/server.js
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const db = require('../config/db'); // Ensure this path is correct
const userRoutes = require('../routes/userRoutes');
const assessmentRoutes = require('../routes/assessmentRoutes');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const winston = require('winston');

const app = express();

// Middleware
app.use(helmet());
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
});
app.use(limiter);

// Routes
app.use('/api/users', userRoutes);
app.use('/api/assessments', assessmentRoutes);

// Basic health check route
app.get('/', async (req, res) => {
    try {
        await db.testConnection(); // Check DB connection
        res.send('Health Risk Assessment API is running');
    } catch (error) {
        res.status(500).send('Database connection issue');
    }
});

// Error handling middleware
app.use((err, req, res, next) => {
    winston.error(err.stack); // Use winston for logging errors
    res.status(err.status || 500).json({
        message: err.message || 'Internal Server Error',
    });
});

// Start the server
const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
    winston.info(`Server is running on port ${PORT}`);
});

// Graceful shutdown
const closeServer = () => {
    server.close(err => {
        if (err) {
            winston.error("Error closing server:", err);
        } else {
            winston.info("Server closed.");
        }
        db.closeConnection(); // Close DB connection
    });
};

process.on('SIGINT', closeServer);
process.on('SIGTERM', closeServer);
