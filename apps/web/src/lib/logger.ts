import winston from 'winston';
import path from 'path';
import fs from 'fs';

const LOG_DIR = path.join(process.cwd(), 'logs');

// Ensure log directory exists
if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
}

// Generate log filename with timestamp: app-YYYY-MM-DD-HH-mm-ss.log
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const logFilename = path.join(LOG_DIR, `app-${timestamp}.log`);

// Create transport for file
const fileTransport = new winston.transports.File({ filename: logFilename });

// Create main logger (File + Console)
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
            return `[${timestamp}] [${level.toUpperCase()}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        fileTransport,
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ],
});

// Create separate logger for instrumentation (File only) to avoid recursion when patching console
export const consoleCaptureLogger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf(({ timestamp, message, ...meta }) => {
            return `[${timestamp}] [CONSOLE]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
        })
    ),
    transports: [
        fileTransport
    ]
});

export default logger;
