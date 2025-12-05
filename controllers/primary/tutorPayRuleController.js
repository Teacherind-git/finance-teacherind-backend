const PayRule = require("../../models/primary/TutorPayRule");
const BasePay = require("../../models/primary/BasePay");
const ClassRange = require("../../models/primary/ClassRange");

// ---------- PAY RULE ----------
exports.savePayRule = async (req, res) => {
  try {
    let payRule = await PayRule.findOne();

    if (payRule) {
      await payRule.update({
        config: req.body.config,
        createdBy: req.user.id ?? 10, // fallback to superadmin 10 if needed
        updatedBy: req.user.id ?? 10,
      });

      return res.json({ message: "Pay rule updated", payRule });
    }

    payRule = await PayRule.create({
      config: req.body.config,
      createdBy: req.user?.id || null,
      updatedBy: req.user.id ?? 10,
    });

    res.status(201).json({ message: "Pay rule created", payRule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.createBasePay = async (req, res) => {
  try {
    const payRule = await PayRule.findOne();

    if (!payRule) {
      return res.status(400).json({
        message: "Pay Rule must be created before adding BasePays.",
      });
    }

    const basePay = await BasePay.create({
      classRangeId: req.body.classRange,
      basePay: req.body.basePay,
      payRuleId: payRule.id,
      createdBy: req.user.id ?? 10, // fallback to superadmin 10 if needed
      updatedBy: req.user.id ?? 10,
    });

    res.status(201).json({ message: "Base pay added", basePay });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateBasePay = async (req, res) => {
  try {
    const basePay = await BasePay.findByPk(req.params.id);

    if (!basePay) {
      return res.status(404).json({ message: "Base pay not found" });
    }

    await basePay.update({
      classRangeId: req.body.classRange,
      basePay: req.body.basePay,
      createdBy: req.user.id ?? 10, // fallback to superadmin 10 if needed
      updatedBy: req.user.id ?? 10,
    });

    res.json({ message: "Base pay updated", basePay });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBasePay = async (req, res) => {
  try {
    const basePay = await BasePay.findByPk(req.params.id);
    if (!basePay) return res.status(404).json({ message: "Not found" });

    await basePay.destroy();
    res.json({ message: "Base pay deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getAllBasePays = async (req, res) => {
  try {
    const basePays = await BasePay.findAll({
      include: [
        {
          model: ClassRange,
          as: "classRange",
          attributes: ["id", "label"],
        },
      ],
      order: [["classRangeId", "ASC"]],
    });

    res.json({ basePays });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.getPayRuleData = async (req, res) => {
  try {
    const payRule = await PayRule.findOne({
      attributes: ["id", "config", "createdAt", "updatedAt"],
    });

    res.json({ data: payRule });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
