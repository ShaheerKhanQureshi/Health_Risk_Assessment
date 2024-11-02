const logger = require('./logger');

const errorLogger = (err, req, res, next) => {
    logger.error(err.stack);
    res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
};

module.exports = errorLogger;
