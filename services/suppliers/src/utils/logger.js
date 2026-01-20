import { createLogger, format, transports } from "winston";
import fs from "fs";
import path from "path";

const logDir = path.join(process.cwd(), "logs");
if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);

const logger = createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: format.combine(
        format.timestamp(),
        format.errors({ stack: true }),
        format.printf(({ timestamp, level, message, stack }) =>
            `${timestamp} [${level}]: ${stack || message}`
        )
    ),
    transports: [
        new transports.Console(),
        new transports.File({ filename: path.join(logDir, "error.log"), level: "error" }),
        new transports.File({ filename: path.join(logDir, "combined.log") }),
    ],
});

export default logger;