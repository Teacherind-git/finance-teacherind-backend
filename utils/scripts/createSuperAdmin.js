const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const bcrypt = require("bcryptjs");

dotenv.config({ path: path.resolve(process.cwd(), ".env") });

const User = require("../../models/User");
const Role = require("../../models/Role");

const createSuperAdmin = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.error("❌ MONGO_URI not found in .env file!");
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log("✅ Connected to MongoDB");

    // Find SuperAdmin role
    let superAdminRole = await Role.findOne({ name: "SuperAdmin" });
    if (!superAdminRole) {
      superAdminRole = await Role.create({
        name: "SuperAdmin",
        permissions: ["*"],
      });
      console.log("🟢 Created SuperAdmin role");
    }

    // Check if SuperAdmin user exists
    const existing = await User.findOne({ email: "superadmin@example.com" });
    if (existing) {
      console.log("🟡 SuperAdmin user already exists");
      process.exit(0);
    }

    // Create SuperAdmin user
    const superAdmin = await User.create({
      name: "Super Admin",
      email: "superadmin@example.com",
      password: "SuperAdmin123!",
      role: superAdminRole._id,
      position: "CEO",
      department: "Management",
      phone: "",
      taxId: "",
      address: { country: "", state: "", postalCode: "" },
      isActive: true,
    });

    console.log("🟢 SuperAdmin user created successfully:");
    console.log("   Email: superadmin@example.com");
    console.log("   Password: SuperAdmin123!");
    console.log("   Position: CEO");

    process.exit(0);
  } catch (err) {
    console.error("❌ Error creating SuperAdmin:", err.message);
    process.exit(1);
  }
};

createSuperAdmin();
