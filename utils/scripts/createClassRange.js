const Class = require("../../models/primary/Class");
const ClassRange = require("../../models/primary/ClassRange");
const User = require("../../models/primary/User");
const { sequelizePrimary } = require("../../config/db");
const logger = require("../../utils/logger");

async function createClassRanges() {
  try {
    await sequelizePrimary.authenticate();
    logger.info("DB connected");

    /* ===============================
       GET ADMIN USER (roleId = 1)
    ================================ */
    const adminUser = await User.findOne({
      where: { roleId: 1 },
      attributes: ["id"],
      raw: true,
    });

    if (!adminUser) {
      logger.error("Admin user with roleId = 1 not found");
      throw new Error("Admin user with roleId = 1 not found");
    }

    const adminUserId = adminUser.id;
    logger.info(`Admin user found`, { adminUserId });

    /* ===============================
       FETCH CLASSES
    ================================ */
    const classes = await Class.findAll({
      attributes: ["number"],
      order: [["number", "ASC"]],
      raw: true,
    });

    if (!classes.length) {
      logger.warn("No classes found");
      return;
    }

    const classNumbers = classes
      .map((c) => parseInt(c.number, 10))
      .filter((n) => !isNaN(n));

    logger.info("Fetched class numbers", { classNumbers });

    /* ===============================
       DEFINE RANGES
    ================================ */
    const ranges = [
      { label: "Class 1 - 3", fromClass: 1, toClass: 3 },
      { label: "Class 5 - 7", fromClass: 5, toClass: 7 },
      { label: "Class 8 - 10", fromClass: 8, toClass: 10 },
      { label: "Class 11 - 12", fromClass: 11, toClass: 12 },
    ];

    /* ===============================
       CREATE / UPDATE RANGES
    ================================ */
    for (const range of ranges) {
      const hasClasses = classNumbers.some(
        (num) => num >= range.fromClass && num <= range.toClass
      );

      if (!hasClasses) {
        logger.warn(`Skipping range`, { label: range.label });
        continue;
      }

      const existingRange = await ClassRange.findOne({
        where: {
          fromClass: range.fromClass,
          toClass: range.toClass,
          isDeleted: false,
        },
      });

      if (existingRange) {
        await existingRange.update({
          createdBy: adminUserId,
        });

        logger.info("Updated class range", {
          label: range.label,
          createdBy: adminUserId,
        });
      } else {
        await ClassRange.create({
          label: range.label,
          fromClass: range.fromClass,
          toClass: range.toClass,
          createdBy: adminUserId,
        });

        logger.info("Created class range", {
          label: range.label,
          createdBy: adminUserId,
        });
      }
    }

    logger.info("Class range create/update completed successfully");
  } catch (error) {
    logger.error("Error while creating/updating class ranges", {
      message: error.message,
      stack: error.stack,
    });
  } finally {
    await sequelizePrimary.close();
    logger.info("DB connection closed");
  }
}

createClassRanges();
