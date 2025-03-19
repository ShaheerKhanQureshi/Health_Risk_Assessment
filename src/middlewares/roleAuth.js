const jwt = require('jsonwebtoken');

const roleAuth = (roles) => {
    return (req, res, next) => {
        const token = req.headers.authorization?.split(' ')[1];

        if (!token) {
            console.log("Authorization token not provided."); 
            return res.status(401).json({ message: 'Unauthorized' });
        }

        jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
            if (err) {
                console.error("Token verification failed:", err.message); // Log for troubleshooting
                return res.status(403).json({ message: 'Forbidden' });
            }

            

            if (!roles.includes(decoded.role)) {
                console.log(`User role '${decoded.role}' is not authorized. Expected roles: ${roles.join(', ')}`); // Log unauthorized access
                return res.status(403).json({ message: 'Forbidden' });
            }

            req.user = decoded; // Attach decoded user info to request
            next(); // Proceed to next middleware
        });
    };
};

module.exports = roleAuth;
