// controllers/packageController.js
const Package = require("../models/Package");

exports.getPackages = async (req, res) => {
  const packages = await Package.findAll({ order: [["price", "ASC"]] });
  res.json(packages);
};

exports.createPackage = async (req, res) => {
  const pkg = await Package.create(req.body);
  res.status(201).json(pkg);
};

exports.updatePackage = async (req, res) => {
  const { id } = req.params;
  await Package.update(req.body, { where: { id } });
  res.json({ message: "Updated successfully" });
};

exports.deletePackage = async (req, res) => {
  const { id } = req.params;
  await Package.destroy({ where: { id } });
  res.json({ message: "Deleted successfully" });
};
