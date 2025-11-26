// Load env variables first
require("dotenv").config();

const { sequelizePrimary } = require("../../config/db");
const Role = require("../../models/primary/Role");

const roles = [
  { name: "SuperAdmin", permissions: ["*"] },
  { name: "Admin", permissions: ["manage-users", "view-finance"] },
  { name: "User", permissions: ["view-finance", "edit-finance"] },
  // Add more roles here anytime
];

const seedRoles = async () => {
  try {
    
    await sequelizePrimary.authenticate();
    console.log("✅ Connected to MySQL");

    // Ensure tables exist
    await sequelizePrimary.sync();

    for (const roleData of roles) {
      const existingRole = await Role.findOne({ where: { name: roleData.name } });
      if (!existingRole) {
        await Role.create(roleData);
        console.log(`🟢 Created role: ${roleData.name}`);
      } else {
        console.log(`🟡 Role already exists: ${roleData.name}`);
      }
    }

    console.log("✅ Role seeding completed!");
    await sequelizePrimary.close();
    process.exit(0);
  } catch (err) {
    console.error("❌ Error seeding roles:", err.message);
    await sequelizePrimary.close();
    process.exit(1);
  }
};

seedRoles();
