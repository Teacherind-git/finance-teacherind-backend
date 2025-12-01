const { sequelizePrimary } = require("../../config/db");
const User = require("../../models/primary/Syllabus");
const Role = require("../../models/primary/TutorPayRule");
// Add more models as needed...

async function run() {
  try {
    // Update User table
    await User.update(
      { createdBy: 10, updatedBy: 10 },
      { where: {} }
    );

    // Update Role table
    await Role.update(
      { createdBy: 10, updatedBy: 10 },
      { where: {} }
    );

    // Add more updates here if you have more models...

    console.log("✅ All records updated successfully!");
    process.exit(0);

  } catch (err) {
    console.error("❌ Error updating:", err);
    process.exit(1);
  }
}

run();
