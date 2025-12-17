const { Sequelize } = require("sequelize");
require("dotenv").config();
const logger = require("../utils/logger"); // ✅ central logger

/* ================= PRIMARY DB ================= */

const sequelizePrimary = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST || "localhost",
    dialect: "mysql",
    logging: false, // set true if you want SQL logs
  }
);

/* ================= SECONDARY DB ================= */

const sequelizeSecondary = new Sequelize(
  process.env.MYSQL_SECOND_DB,
  process.env.MYSQL_SECOND_USER,
  process.env.MYSQL_SECOND_PASSWORD,
  {
    host: process.env.MYSQL_SECOND_HOST || "localhost",
    dialect: "mysql",
    logging: false,
  }
);

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
  connectDBs,
};
