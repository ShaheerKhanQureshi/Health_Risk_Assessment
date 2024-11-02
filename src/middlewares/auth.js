// const jwt = require("jsonwebtoken");
// const logger = require("../utils/logger"); // Assuming a logging utility is available

// // Middleware to authenticate using JWT and check for specific roles
// const authenticate = (requiredRole = null) => {
//     return (req, res, next) => {
//         // Check for the authorization header
//         const authHeader = req.headers["authorization"];
//         if (!authHeader) {
//             logger.warn("Authentication failed: No authorization header found");
//             return res.status(401).json({ message: "No authorization header provided" });
//         }

//         // Extract the token from the header
//         const token = authHeader.split(" ")[1];
//         if (!token) {
//             logger.warn("Authentication failed: No token provided");
//             return res.status(401).json({ message: "No token provided" });
//         }

//         // Verify the token
//         jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
//             if (err) {
//                 const errorMessage =
//                     err.name === "JsonWebTokenError"
//                         ? "Invalid token"
//                         : err.name === "TokenExpiredError"
//                         ? "Token has expired"
//                         : "Failed to authenticate token";

//                 logger.warn(`Authentication failed: ${errorMessage}`);
//                 return res.status(401).json({ message: errorMessage });
//             }

//             // Attach user information to the request object
//             req.user = { id: decoded.id, role: decoded.role };

//             // Check if a specific role is required and user has that role
//             if (requiredRole && decoded.role !== requiredRole) {
//                 logger.warn(`Access denied for user ${decoded.id}: insufficient permissions`);
//                 return res.status(403).json({ message: "Forbidden: Insufficient permissions" });
//             }

//             next(); // Continue to the next middleware or route
//         });
//     };
// };

// // Middleware to check if the user has the required role(s)
// const hasRole = (roles = []) => {
//     return (req, res, next) => {
//         if (!req.user) {
//             logger.warn("Access denied: User not authenticated");
//             return res.status(403).json({ error: "Forbidden: User not authenticated" });
//         }
//         if (!roles.includes(req.user.role)) {
//             logger.warn(`Access denied for user ${req.user.id}: insufficient permissions`);
//             return res.status(403).json({ error: "Forbidden: Insufficient permissions" });
//         }
//         next();
//     };
// };

// // Admin-specific middleware using the hasRole function
// const isAdmin = hasRole(["admin"]);

// // Middleware for employee access to forms (no token required)
// const employeeAccess = (req, res, next) => {
//     // This can be an open access route for employees to submit forms
//     next();
// };
// const jwt = require('jsonwebtoken');
// const db = require('../config/db'); // Ensure this path points to the correct db.js file

// // Middleware to authenticate using JWT
// const authenticate = async (req, res, next) => {
//     const token = req.headers['authorization']?.split(' ')[1];

//     if (!token) {
//         return res.status(401).json({ message: 'No token provided' });
//     }

//     try {
//         const decoded = jwt.verify(token, process.env.JWT_SECRET);
//         req.userId = decoded.id;
//         req.userRole = decoded.role;

//         // Optional user existence check
//         const query = 'SELECT * FROM users WHERE id = ?';
//         const [results] = await db.query(query, [req.userId]);

//         if (results.length === 0) {
//             return res.status(401).json({ message: 'Invalid token' });
//         }

//         next(); // User is authenticated, proceed to next middleware or route handler
//     } catch (err) {
//         if (err.name === 'TokenExpiredError') {
//             return res.status(401).json({ message: 'Token has expired' });
//         }
//         return res.status(401).json({ message: 'Failed to authenticate token' });
//     }
// };

// // Middleware to check if the user has the required role
// const authorize = (roles = []) => {
//     return (req, res, next) => {
//         if (roles.length && !roles.includes(req.userRole)) {
//             return res.status(403).json({ message: 'Access denied: insufficient permissions' });
//         }
//         next(); // User has required role, proceed to next middleware or route handler
//     };
// };

// // Optional: Middleware for employee access without authentication
// const employeeAccess = (req, res, next) => {
//     next(); // Allow access for employees to submit forms
// };
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
