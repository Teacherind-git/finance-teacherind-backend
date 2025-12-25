const dotenv = require("dotenv");
const path = require("path");
dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { sequelizePrimary } = require("../../config/db");
const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");
const logger = require("../../utils/logger"); // ✅ central logger

const createAdminUsers = async () => {
  try {
    await sequelizePrimary.authenticate();
    logger.info("✅ Connected to MySQL");

    await sequelizePrimary.sync();

    // Ensure Admin role exists
    let adminRole = await Role.findOne({ where: { name: "Admin" } });
    if (!adminRole) {
      adminRole = await Role.create({
        name: "Admin",
        permissions: ["read", "write", "update"], // adjust if needed
      });
      logger.info("🟢 Created Admin role");
    }

    // Find any existing user with roleId = 1 to use as createdBy / updatedBy
    const creatorUser = await User.findOne({ where: { roleId: 1 } });
    const createdById = creatorUser ? creatorUser.id : null;

    if (!createdById) {
      logger.warn(
        "⚠ No existing user with roleId=1 found. createdBy/updatedBy will be null."
      );
    }

    // Users to create
    const adminUsers = [
      {
        title: "CEO",
        envEmail: process.env.CEO_EMAIL,
        envPass: process.env.CEO_PASSWORD,
        defaultEmail: "ceo@example.com",
        defaultPass: "CeoAdmin123!",
      },
      {
        title: "CFO",
        envEmail: process.env.CFO_EMAIL,
        envPass: process.env.CFO_PASSWORD,
        defaultEmail: "cfo@example.com",
        defaultPass: "CfoAdmin123!",
      },
      {
        title: "CTO",
        envEmail: process.env.CTO_EMAIL,
        envPass: process.env.CTO_PASSWORD,
        defaultEmail: "cto@example.com",
        defaultPass: "CtoAdmin123!",
      },
    ];

    for (const admin of adminUsers) {
      const email = admin.envEmail || admin.defaultEmail;
      const password = admin.envPass || admin.defaultPass;

      // Check if user exists
      const existingUser = await User.findOne({ where: { email } });

      if (existingUser) {
        logger.warn(`${admin.title} already exists (${email}), skipping...`);
        continue;
      }

      // Create user with createdBy / updatedBy
      await User.create({
        firstName: admin.title,
        lastName: "Admin",
        email,
        password,
        roleId: adminRole.id,
        position: admin.title,
        department: "Management",
        phone: "",
        taxId: "",
        address: "",
        isActive: true,
        createdBy: createdById,
        updatedBy: createdById,
      });

      logger.info(
        `${admin.title} created: Email: ${email}, Password: ${password}`
      );
    }

    await sequelizePrimary.close();
    logger.info("🔒 MySQL connection closed");
    process.exit(0);
  } catch (err) {
    logger.error("❌ Error creating Admin users", {
      message: err.message,
      stack: err.stack,
    });
    await sequelizePrimary.close();
    process.exit(1);
  }
};

createAdminUsers();
