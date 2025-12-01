const { sequelizePrimary } = require("../../config/db");
const FeeStructure = require("../../models/primary/FeeStructure");


(async () => {
  try {
    await sequelizePrimary.authenticate();
    console.log("✅ Database connection established.");

    // Create table if it doesn't exist
    await FeeStructure.sync({ alter: true });
    console.log("✅ table created or updated successfully.");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating table:", error);
    process.exit(1);
  }
})();
