const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { sequelizePrimary } = require("../../config/db");
const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");

const createSuperAdmin = async () => {
  try {
    await sequelizePrimary.authenticate();
    console.log("✅ Connected to MySQL");

    // Ensure tables exist
    await sequelizePrimary.sync();

    // Check or create SuperAdmin role
    let superAdminRole = await Role.findOne({ where: { name: "SuperAdmin" } });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: "SuperAdmin",
        permissions: ["*"],
      });
      console.log("🟢 Created SuperAdmin role");
    }

    const email = process.env.SUPERADMIN_EMAIL || "superadmin@example.com";
    const password = process.env.SUPERADMIN_PASSWORD || "SuperAdmin123!";

    // Check if SuperAdmin user exists
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      console.log("🟡 SuperAdmin user already exists");
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

    console.log("🟢 SuperAdmin user created successfully:");
    console.log(`   Email: ${email}`);
    console.log(`   Password: ${password}`);
    console.log("   Role: SuperAdmin");

    await sequelizePrimary.close();
    console.log("🔒 MySQL connection closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating SuperAdmin:", err.message);
    await sequelizePrimary.close();
    process.exit(1);
  }
};

createSuperAdmin();
