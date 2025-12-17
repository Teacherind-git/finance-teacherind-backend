const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { sequelizePrimary } = require("../../config/db");
const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");
const logger = require("../../utils/logger"); // ✅ centralized logger

const createSuperAdmin = async () => {
  try {
    await sequelizePrimary.authenticate();
    logger.info("✅ Connected to MySQL");

    // Ensure tables exist
    await sequelizePrimary.sync();

    // Check or create SuperAdmin role
    let superAdminRole = await Role.findOne({ where: { name: "SuperAdmin" } });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: "SuperAdmin",
        permissions: ["*"],
      });
      logger.info("🟢 Created SuperAdmin role");
    }

    const email = process.env.SUPERADMIN_EMAIL || "superadmin@example.com";
    const password = process.env.SUPERADMIN_PASSWORD || "SuperAdmin123!";

    // Check if SuperAdmin user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      logger.warn("🟡 SuperAdmin user already exists");
      await sequelizePrimary.close();
      process.exit(0);
    }

    // Create SuperAdmin user
    await User.create({
      firstName: "Super Admin",
      lastName: "",
      email,
      password: password,
      roleId: superAdminRole.id,
      position: "CEO",
      department: "Management",
      phone: "",
      taxId: "",
      address: { country: "", state: "", postalCode: "" },
      isActive: true,
    });

    logger.info("🟢 SuperAdmin user created successfully", {
      email,
      password,
      role: "SuperAdmin",
    });

    await sequelizePrimary.close();
    logger.info("🔒 MySQL connection closed");
    process.exit(0);
  } catch (err) {
    logger.error("❌ Error creating SuperAdmin", {
      message: err.message,
      stack: err.stack,
    });
    await sequelizePrimary.close();
    process.exit(1);
  }
};

createSuperAdmin();
