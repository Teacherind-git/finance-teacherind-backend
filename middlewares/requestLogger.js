const fs = require("fs");
const path = require("path");

const logFile = path.join(__dirname, "../logs/request.log");

const requestLogger = (req, res, next) => {
  const log = `[${new Date().toISOString()}] ${req.method} ${req.originalUrl}\n`;
  fs.appendFile(logFile, log, (err) => {
    if (err) console.error("Failed to write log:", err);
  });
  console.log(log.trim());
  next();
};

module.exports = requestLogger;
