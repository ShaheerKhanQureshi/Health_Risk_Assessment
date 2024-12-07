const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const db = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'risk_assessment_new',
    waitForConnections: true,
    connectionLimit: 20, // Adjust based on your load testing results
    queueLimit: 0,
    connectTimeout: 100000 // Optional: Timeout after 10 seconds if connection fails
});

db.getConnection()
    .then((connection) => {
        console.log('Connected to MySQL database.');
        connection.release(); // Release the connection back to the pool
    })
    .catch((err) => {
        console.error(`Error connecting to MySQL database: ${err.code} - ${err.message}`);
        process.exit(1);
    });

module.exports = db;
