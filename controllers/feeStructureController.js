// controllers/feeStructureController.js
const FeeStructure = require("../models/FeeStructure");

exports.getAllFeeStructures = async (req, res) => {
  try {
    const data = await FeeStructure.findAll({ order: [["updatedAt", "DESC"]] });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: "Failed to fetch fee structures" });
  }
};

exports.createFeeStructure = async (req, res) => {
  try {
    const newRecord = await FeeStructure.create(req.body);
    res.status(201).json(newRecord);
  } catch (err) {
    res.status(500).json({ message: "Failed to create record" });
  }
};

exports.updateFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    await FeeStructure.update(req.body, { where: { id } });
    res.json({ message: "Updated successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to update record" });
  }
};

exports.deleteFeeStructure = async (req, res) => {
  try {
    const { id } = req.params;
    await FeeStructure.destroy({ where: { id } });
    res.json({ message: "Deleted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete record" });
  }
};
