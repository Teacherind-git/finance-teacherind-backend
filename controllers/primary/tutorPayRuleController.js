const PayRule = require("../../models/primary/TutorPayRule");
const BasePay = require("../../models/primary/BasePay");
const ClassRange = require("../../models/primary/ClassRange");
const logger = require("../../utils/logger");

/* ================= PAY RULE ================= */
exports.savePayRule = async (req, res) => {
  try {
    logger.info("Saving pay rule", {
      updatedBy: req.user?.id,
    });

    let payRule = await PayRule.findOne();

    if (payRule) {
      await payRule.update({
        config: req.body.config,
        updatedBy: req.user.id ?? 10,
      });

      logger.info("Pay rule updated", { payRuleId: payRule.id });

      return res.json({ message: "Pay rule updated", payRule });
    }

    payRule = await PayRule.create({
      config: req.body.config,
      createdBy: req.user?.id || 10,
      updatedBy: req.user?.id || 10,
    });

    logger.info("Pay rule created", { payRuleId: payRule.id });

    res.status(201).json({ message: "Pay rule created", payRule });
  } catch (error) {
    logger.error("Error saving pay rule", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= BASE PAY ================= */
exports.createBasePay = async (req, res) => {
  try {
    logger.info("Creating base pay", {
      classRangeId: req.body.classRange,
      createdBy: req.user?.id,
    });

    const payRule = await PayRule.findOne();
    if (!payRule) {
      logger.warn("BasePay creation failed – PayRule missing");
      return res.status(400).json({
        message: "Pay Rule must be created before adding BasePays.",
      });
    }

    const basePay = await BasePay.create({
      classRangeId: req.body.classRange,
      basePay: req.body.basePay,
      payRuleId: payRule.id,
      createdBy: req.user.id ?? 10,
      updatedBy: req.user.id ?? 10,
    });

    logger.info("Base pay created", { basePayId: basePay.id });

    res.status(201).json({ message: "Base pay added", basePay });
  } catch (error) {
    logger.error("Error creating base pay", error);
    res.status(500).json({ message: error.message });
  }
};

exports.updateBasePay = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Updating base pay", {
      basePayId: id,
      updatedBy: req.user?.id,
    });

    const basePay = await BasePay.findByPk(id);
    if (!basePay) {
      logger.warn(`Base pay not found: ${id}`);
      return res.status(404).json({ message: "Base pay not found" });
    }

    await basePay.update({
      classRangeId: req.body.classRange,
      basePay: req.body.basePay,
      updatedBy: req.user.id ?? 10,
    });

    logger.info("Base pay updated", { basePayId: basePay.id });

    res.json({ message: "Base pay updated", basePay });
  } catch (error) {
    logger.error("Error updating base pay", error);
    res.status(500).json({ message: error.message });
  }
};

exports.deleteBasePay = async (req, res) => {
  try {
    const { id } = req.params;

    logger.info("Soft deleting base pay", { basePayId: id });

    const basePay = await BasePay.findOne({
      where: {
        id,
        isDeleted: false,
      },
    });

    if (!basePay) {
      logger.warn(`Base pay not found for delete: ${id}`);
      return res.status(404).json({ message: "Base pay not found" });
    }

    await basePay.update({
      isDeleted: true,
      updatedBy: req.user?.id || null, // ✅ optional audit
    });

    logger.info("Base pay soft deleted", { basePayId: id });

    res.json({
      success: true,
      message: "Base pay deleted successfully",
    });
  } catch (error) {
    logger.error("Error soft deleting base pay", error);
    res.status(500).json({ message: error.message });
  }
};

exports.getAllBasePays = async (req, res) => {
  try {
    logger.info("Fetching all base pays");

    const basePays = await BasePay.findAll({
      where: { isDeleted: false }, // ✅ exclude deleted
      include: [
        {
          model: ClassRange,
          as: "classRange",
          attributes: ["id", "label"],
        },
      ],
      order: [["classRangeId", "ASC"]],
    });

    logger.info(`Base pays fetched: ${basePays.length}`);

    res.json({ basePays });
  } catch (error) {
    logger.error("Error fetching base pays", error);
    res.status(500).json({ message: error.message });
  }
};

/* ================= PAY RULE DATA ================= */
exports.getPayRuleData = async (req, res) => {
  try {
    logger.info("Fetching pay rule data");

    const payRule = await PayRule.findOne({
      attributes: ["id", "config", "createdAt", "updatedAt"],
    });

    if (payRule && payRule.config) {
      payRule.config = JSON.parse(payRule.config);
    }

    res.json({ data: payRule });
  } catch (error) {
    logger.error("Error fetching pay rule", error);
    res.status(500).json({ message: error.message });
  }
};
