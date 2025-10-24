const { Sequelize } = require("sequelize");
require("dotenv").config();

// 🟢 Primary DB connection (your current DB)
const sequelizePrimary = new Sequelize(
  process.env.MYSQL_DB,
  process.env.MYSQL_USER,
  process.env.MYSQL_PASSWORD,
  {
    host: process.env.MYSQL_HOST || "localhost",
    dialect: "mysql",
    logging: false,
  }
);

// 🔵 Secondary DB connection (external/source DB)
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

const connectDBs = async () => {
  try {
    await sequelizePrimary.authenticate();
    console.log("✅ Primary MySQL Connected");

    await sequelizeSecondary.authenticate();
    console.log("✅ Secondary MySQL Connected");
  } catch (error) {
    console.error("❌ MySQL Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = { sequelizePrimary, sequelizeSecondary, connectDBs };
