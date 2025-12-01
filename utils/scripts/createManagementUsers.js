const dotenv = require("dotenv");
const path = require("path");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const { sequelizePrimary } = require("../../config/db");
const User = require("../../models/primary/User");
const Role = require("../../models/primary/Role");

const bcrypt = require("bcryptjs");

const createAdminUsers = async () => {
  try {
    await sequelizePrimary.authenticate();
    console.log("✅ Connected to MySQL");

    await sequelizePrimary.sync();

    // Ensure Admin role exists
    let adminRole = await Role.findOne({ where: { name: "Admin" } });
    if (!adminRole) {
      adminRole = await Role.create({
        name: "Admin",
        permissions: ["read", "write", "update"], // adjust if needed
      });
      console.log("🟢 Created Admin role");
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
        console.log(`🟡 ${admin.title} already exists (${email}), skipping...`);
        continue;
      }

      // Create user
      await User.create({
        firstName: admin.title,
        lastName: "Admin",
        email,
        password: password,
        roleId: adminRole.id,
        position: admin.title,
        department: "Management",
        phone: "",
        taxId: "",
        address: { country: "", state: "", postalCode: "" },
        isActive: true,
      });

      console.log(`🟢 ${admin.title} created:`);
      console.log(`   Email: ${email}`);
      console.log(`   Password: ${password}`);
    }

    await sequelizePrimary.close();
    console.log("🔒 MySQL connection closed");
    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating Admin users:", err.message);
    await sequelizePrimary.close();
    process.exit(1);
  }
};

createAdminUsers();
