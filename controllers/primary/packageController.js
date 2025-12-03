const Package = require("../../models/primary/Package");

// ✅ Get all packages
exports.getAll = async (req, res) => {
  try {
    const packages = await Package.findAll();
    res.status(200).json({
      success: true,
      packages,
    });
  } catch (error) {
    console.error("Error fetching all data:", error);
    res.status(500).json({ message: error.message });
  }
};

// ✅ Get single package by ID
exports.getById = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });
    res.json(pkg);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ Create a new package
exports.create = async (req, res) => {
  console.log('9999', req.body);
  
  try {
    const pkg = await Package.create({
      ...req.body,
      createdBy: req.user.id ?? 10, // fallback to superadmin 10 if needed
      updatedBy: req.user.id ?? 10,
    });

    res.status(201).json(pkg);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Update a package
exports.update = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    await pkg.update({
      ...req.body,
      updatedBy: req.user.id ?? 10, // set updatedBy every edit
    });

    res.json(pkg);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ Delete a package
exports.delete = async (req, res) => {
  try {
    const pkg = await Package.findByPk(req.params.id);
    if (!pkg) return res.status(404).json({ message: "Package not found" });

    await pkg.destroy();
    res.json({ message: "Package deleted successfully" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};
