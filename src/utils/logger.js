const fs = require('fs');
const { createLogger, format, transports } = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const logsDir = 'logs';

if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir);
}

const transportFile = new DailyRotateFile({
    filename: `${logsDir}/%DATE%-results.log`,
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
});

const logLevel = process.env.NODE_ENV === 'production' ? 'info' : 'debug';

const customFormat = format.printf(({ timestamp, level, message, ...meta }) => {
    return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
});

const logger = createLogger({
    level: logLevel,
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        customFormat
    ),
    transports: [
        new transports.Console({
            format: format.combine(
                format.colorize(),
                format.simple()
            ),
        }),
        transportFile,
    ],
});

logger.logRequest = (req) => {
    logger.info(`Request: ${req.method} ${req.url}`, {
        userId: req.user ? req.user.id : null,
        query: req.query,
        body: req.body,
    });
};

logger.logError = (error, context = {}) => {
    logger.error(error.message, {
        stack: error.stack,
        ...context,
    });
};

module.exports = logger;
