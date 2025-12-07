const { createLogger, format, transports } = require("winston");
const path = require("path");

const logFormat = format.printf(({ level, message, timestamp, stack }) => {
  return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    logFormat
  ),
  transports: [
    // 🔹 Console logs
    new transports.Console({
      format: format.combine(
        format.colorize(),
        logFormat
      ),
    }),

    // 🔹 Error logs
    new transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
    }),

    // 🔹 All logs
    new transports.File({
      filename: path.join("logs", "combined.log"),
    }),
  ],
});

module.exports = logger;
