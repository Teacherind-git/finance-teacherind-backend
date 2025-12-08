const Package = require("../../models/primary/Package");
const logger = require("../../utils/logger");

// ✅ Get all packages
exports.getAll = async (req, res) => {
  try {
    logger.info("Fetching all packages");

    const packages = await Package.findAll({
      where: { isDeleted: false }, // ✅ exclude soft-deleted
      order: [["createdAt", "DESC"]],
    });

    logger.info(`Packages fetched: ${packages.length}`);

    res.status(200).json({
      success: true,
      packages,
    });
  } catch (error) {
    logger.error("Error fetching packages", error);
    res.status(500).json({ message: "Failed to fetch packages" });
  }
};

// ✅ Get single package by ID
exports.getById = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Fetching package by ID: ${id}`);

    const pkg = await Package.findByPk(id);
    if (!pkg) {
      logger.warn(`Package not found: ${id}`);
      return res.status(404).json({ message: "Package not found" });
    }

    res.json(pkg);
  } catch (error) {
    logger.error("Error fetching package by ID", error);
    res.status(500).json({ message: "Failed to fetch package" });
  }
};

// ✅ Create a new package
exports.create = async (req, res) => {
  try {
    logger.info("Creating new package", {
      body: req.body,
      userId: req.user?.id,
    });

    const userId = req.user?.id ?? 10; // fallback

    const pkg = await Package.create({
      ...req.body,
      createdBy: userId,
      updatedBy: userId,
    });

    logger.info(`Package created`, {
      id: pkg.id,
      createdBy: userId,
    });

    res.status(201).json(pkg);
  } catch (error) {
    logger.error("Error creating package", error);
    res.status(400).json({ message: "Failed to create package" });
  }
};

// ✅ Update a package
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.id ?? 10;

    logger.info(`Updating package`, {
      id,
      userId,
      body: req.body,
    });

    const pkg = await Package.findByPk(id);
    if (!pkg) {
      logger.warn(`Package not found for update: ${id}`);
      return res.status(404).json({ message: "Package not found" });
    }

    await pkg.update({
      ...req.body,
      updatedBy: userId,
    });

    logger.info(`Package updated`, {
      id,
      updatedBy: userId,
    });

    res.json(pkg);
  } catch (error) {
    logger.error("Error updating package", error);
    res.status(400).json({ message: "Failed to update package" });
  }
};

// ✅ Delete a package
exports.delete = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info(`Soft deleting package: ${id}`);

    const pkg = await Package.findOne({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!pkg) {
      logger.warn(`Package not found for delete: ${id}`);
      return res.status(404).json({ message: "Package not found" });
    }

    await pkg.update({
      isDeleted: true,
      updatedBy: req.user?.id || null, // ✅ optional audit
    });

    logger.info(`Package soft deleted: ${id}`);

    res.json({
      success: true,
      message: "Package deleted successfully",
    });
  } catch (error) {
    logger.error("Error soft deleting package", error);
    res.status(400).json({ message: "Failed to delete package" });
  }
};
