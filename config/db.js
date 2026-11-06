const { Sequelize } = require("sequelize");
require("dotenv").config();
const logger = require("../utils/logger");

/* ================= PRIMARY DB ================= */

const sequelizePrimary = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST || "localhost",
    port: process.env.MYSQL_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
);

/* ================= SECONDARY DB ================= */

const sequelizeSecondary = new Sequelize(
  process.env.MYSQL_SECOND_DB,
  process.env.MYSQL_SECOND_USER,
  process.env.MYSQL_SECOND_PASSWORD,
  {
    host: process.env.MYSQL_SECOND_HOST,
    port: process.env.MYSQL_SECOND_PORT || 3306,
    dialect: "mysql",
    logging: false,
  }
);

/* ================= QUESTION BANK DB ================= */

// Source of truth for syllabus / classes / subjects (optional; when not
// configured the finance DB's own copies are used as-is)
const sequelizeQuestionBank = process.env.QB_DB_NAME
  ? new Sequelize(
      process.env.QB_DB_NAME,
      process.env.QB_DB_USER,
      process.env.QB_DB_PASSWORD,
      {
        host: process.env.QB_DB_HOST || "localhost",
        port: process.env.QB_DB_PORT || 3306,
        dialect: "mysql",
        logging: false,
      }
    )
  : null;

/* ================= CONNECT DBS ================= */

const connectDBs = async () => {
  try {
    logger.info("🔌 Connecting to Primary MySQL...");
    await sequelizePrimary.authenticate();
    logger.info("✅ Primary MySQL Connected");

    logger.info("🔌 Connecting to Secondary MySQL...");
    await sequelizeSecondary.authenticate();
    logger.info("✅ Secondary MySQL Connected");
  } catch (error) {
    logger.error("❌ MySQL Connection Failed", {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};

module.exports = {
  sequelizePrimary,
  sequelizeSecondary,
  sequelizeQuestionBank,
  connectDBs,
};
