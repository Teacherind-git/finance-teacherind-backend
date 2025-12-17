// Load env variables first
require("dotenv").config();
const { sequelizePrimary } = require("../../config/db");
const Role = require("../../models/primary/Role");
const logger = require("../../utils/logger"); // optional centralized logger

const roles = [
  { name: "SuperAdmin", permissions: ["*"] },
  { name: "Admin", permissions: ["manage-users", "view-finance"] },
  { name: "User", permissions: ["view-finance", "edit-finance"] },
  // Add more roles here anytime
];

const seedRoles = async () => {
  try {
    await sequelizePrimary.authenticate();
    logger.info("✅ Connected to MySQL");

    // Ensure tables exist
    await sequelizePrimary.sync();

    for (const roleData of roles) {
      const existingRole = await Role.findOne({ where: { name: roleData.name } });
      if (!existingRole) {
        await Role.create(roleData);
        logger.info(`🟢 Created role: ${roleData.name}`);
      } else {
        logger.warn(`🟡 Role already exists: ${roleData.name}`);
      }
    }

    logger.info("✅ Role seeding completed!");
    await sequelizePrimary.close();
    process.exit(0);
  } catch (err) {
    logger.error("❌ Error seeding roles:", { message: err.message, stack: err.stack });
    await sequelizePrimary.close();
    process.exit(1);
  }
};

seedRoles();
