const { Sequelize } = require("sequelize");
require("dotenv").config();

const sequelize = new Sequelize(
  process.env.MYSQL_DB, // database name
  process.env.MYSQL_USER, // username
  process.env.MYSQL_PASSWORD, // password
  {
    host: process.env.MYSQL_HOST || "localhost",
    dialect: "mysql",
    logging: false, // disable SQL logs in console
  }
);

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ MySQL Connected");
  } catch (error) {
    console.error("❌ MySQL Connection Failed:", error.message);
    process.exit(1);
  }
};

module.exports = { sequelize, connectDB };
