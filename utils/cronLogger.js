const { createLogger, format, transports } = require("winston");
const path = require("path");

const cronLogger = createLogger({
  level: "info",
  format: format.combine(
    format.timestamp({ format: "YYYY-MM-DD HH:mm:ss" }),
    format.errors({ stack: true }),
    format.splat(),
    format.printf(({ timestamp, level, message, stack }) => {
      return `${timestamp} [${level}]: ${stack || message}`;
    })
  ),
  transports: [
    new transports.File({
      filename: path.join("logs", "cron.log"), // ONLY cron logs stored here
      level: "info",
    }),
  ],
});

module.exports = cronLogger;