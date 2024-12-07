const jwt = require("jsonwebtoken");
const logger = require("../utils/logger");
const db = require('../config/db');

const createErrorResponse = (res, statusCode, message) => {
    logger.warn(message);
    return res.status(statusCode).json({ message });
};

const authenticate = (requiredRole) => {
    return (req, res, next) => {
        const authHeader = req.headers["authorization"];
        if (!authHeader) {
            return createErrorResponse(res, 401, 'Authorization header is required');
        }

        const token = authHeader.split(" ")[1];
        if (!token) {
            return createErrorResponse(res, 401, "Authentication failed: No token provided");
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                const errorMessage = err instanceof jwt.TokenExpiredError
                    ? 'Token has expired'
                    : 'Failed to authenticate token';
                return createErrorResponse(res, 401, errorMessage);
            }

            req.userId = decoded.id;
            req.userRole = decoded.role;

            db.query('SELECT id FROM users WHERE id = ?', [req.userId])
                .then(([results]) => {
                    if (results.length === 0) {
                        return createErrorResponse(res, 401, `Authentication failed: Invalid token for user ID ${req.userId}`);
                    }
                    next();
                })
                .catch(error => {
                    logger.error("Database error during authentication:", error);
                    return createErrorResponse(res, 500, "Internal server error during authentication.");
                });
        });
    };
};

const authorize = (roles = []) => {
    return (req, res, next) => {
        if (!req.userRole) {
            return createErrorResponse(res, 403, "Access denied: User not authenticated");
        }

        if (roles.length && !roles.includes(req.userRole)) {
            return createErrorResponse(res, 403, `Access denied for user ${req.userId}: insufficient permissions`);
        }

        next();
    };
};

const adminPermissions = ['admin'];
const subAdminPermissions = ['sub-admin'];

const isAdmin = authorize(adminPermissions);
const isSubAdmin = authorize(subAdminPermissions);

const canReviewReports = (req, res, next) => {
    if (['admin', 'sub-admin'].includes(req.userRole)) {
        return next();
    }
    return createErrorResponse(res, 403, `Access denied for user ${req.userId}: insufficient permissions to review reports`);
};

const handleFormSubmission = (req, res) => {
    const { userId, answers } = req.body;

    db.query('SELECT * FROM submissions WHERE userId = ?', [userId])
        .then(([existingSubmission]) => {
            if (existingSubmission.length > 0) {
                return createErrorResponse(res, 400, "You have already submitted the form.");
            }

            const healthRiskScore = calculateHealthRiskScore(answers);

            db.query('INSERT INTO submissions (userId, answers, healthRiskScore) VALUES (?, ?, ?)', 
                [userId, JSON.stringify(answers), healthRiskScore])
                .then(() => {
                    sendReport(userId, healthRiskScore);
                    return res.status(200).json({ message: "Form submitted successfully." });
                })
                .catch(insertError => {
                    logger.error("Failed to save form submission:", insertError);
                    return createErrorResponse(res, 500, "Failed to save form submission.");
                });
        })
        .catch(error => {
            logger.error("Database error during submission check:", error);
            return createErrorResponse(res, 500, "Database error occurred during submission check.");
        });
};

module.exports = {
    authenticate,
    isAdmin,
    isSubAdmin,
    canReviewReports,
    handleFormSubmission,
};
