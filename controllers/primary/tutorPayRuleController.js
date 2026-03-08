const { Op } = require("sequelize");
const PayRule = require("../../models/primary/TutorPayRule");
const BasePay = require("../../models/primary/BasePay");
const ClassRange = require("../../models/primary/ClassRange");
const Syllabus = require("../../models/primary/Syllabus");
const Class = require("../../models/primary/Class");
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
    logger.info("Create BasePay request received");

    logger.debug("Request body: %o", req.body);

    const { slab, classRange, syllabusId, board, basePay } = req.body;

    if (!slab) {
      logger.warn("Slab missing in request body", { body: req.body });
      return res.status(400).json({ message: "slab is not defined" });
    }

    if (!classRange || !syllabusId || !board || !basePay) {
      logger.warn("Missing required fields", {
        classRange,
        syllabusId,
        board,
        basePay,
      });
      return res.status(400).json({ message: "Missing required fields" });
    }

    const newBasePay = await BasePay.create({
      slab,
      classRangeId: Number(classRange),
      syllabusId,
      board,
      basePay: Number(basePay),
      createdBy: req.user?.id ?? 10,
      updatedBy: req.user?.id ?? 10,
    });

    logger.info("BasePay created successfully", {
      id: newBasePay.id,
      slab,
      classRange,
      syllabusId,
      board,
      basePay,
    });

    res.status(201).json({
      message: "Base Pay added successfully",
      basePay: newBasePay,
    });
  } catch (error) {
    logger.error("Error creating BasePay", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({ message: error.message });
  }
};

exports.updateBasePay = async (req, res) => {
  try {
    const { id } = req.params;
    const { basePay } = req.body;

    const record = await BasePay.findByPk(id);
    if (!record || record.isDeleted) {
      return res.status(404).json({ message: "Base Pay not found" });
    }

    await record.update({
      basePay,
      updatedBy: req.user?.id ?? 10,
    });

    logger.info("Base pay updated", { basePayId: record.id });

    res.json({
      message: "Base Pay updated successfully",
      basePay: record,
    });
  } catch (error) {
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
      where: { isDeleted: false },
      include: [
        {
          model: ClassRange,
          as: "classRange",
          attributes: ["id", "label"],
        },
        {
          model: Syllabus,
          as: "syllabus",
          attributes: ["id", "name"],
        },
      ],
      order: [["classRangeId", "ASC"]],
    });

    logger.info(`Base pays fetched: ${basePays.length}`);

    const grouped = {
      slab1: [],
      slab2: [],
      slab3: [],
    };

    basePays.forEach((item) => {
      if (grouped[item.slab]) {
        grouped[item.slab].push(item);
      } else {
        logger.warn("Unknown slab found in BasePay", {
          id: item.id,
          slab: item.slab,
        });
      }
    });

    res.status(200).json({ data: grouped });
  } catch (error) {
    logger.error("Error fetching base pays", {
      error: error.message,
      stack: error.stack,
    });

    res.status(500).json({ message: error.message });
  }
};

exports.getBasePayBySelection = async (req, res) => {
  logger.info("Get BasePay request received");
  logger.debug("Query params: %o", req.query);

  try {
    const { classId, syllabusId, board, slab } = req.query;

    if (!classId || !syllabusId || !board || !slab) {
      logger.warn("Missing required query params", {
        classId,
        syllabusId,
        board,
        slab,
      });
      return res.status(400).json({ message: "Missing required parameters" });
    }

    // 1. Fetch class
    const selectedClass = await Class.findByPk(classId);

    if (!selectedClass) {
      logger.warn("Class not found", { classId });
      return res.status(404).json({ message: "Class not found" });
    }

    logger.debug("Selected class found", {
      classId,
      classNumber: selectedClass.number,
    });

    // 2. Find class range
    const classRange = await ClassRange.findOne({
      where: {
        fromClass: { [Op.lte]: selectedClass.number },
        toClass: { [Op.gte]: selectedClass.number },
        isDeleted: false,
      },
    });

    if (!classRange) {
      logger.warn("No ClassRange matched", {
        classNumber: selectedClass.number,
      });
      return res.json({ basePay: 0 });
    }

    logger.debug("ClassRange matched", {
      classRangeId: classRange.id,
      fromClass: classRange.fromClass,
      toClass: classRange.toClass,
    });

    // 3. Find base pay
    const basePay = await BasePay.findOne({
      where: {
        slab,
        syllabusId,
        board,
        classRangeId: classRange.id,
      },
    });

    if (!basePay) {
      logger.warn("BasePay not configured", {
        slab,
        syllabusId,
        board,
        classRangeId: classRange.id,
      });
      return res.json({ basePay: 0 });
    }

    logger.info("BasePay fetched successfully", {
      basePayId: basePay.id,
      amount: basePay.basePay,
    });

    return res.json({ basePay: basePay.basePay });
  } catch (error) {
    logger.error("Error fetching BasePay", {
      error: error.message,
      stack: error.stack,
    });

    return res.status(500).json({ message: "Internal server error" });
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
      // Parse ONLY if config is a string
      if (typeof payRule.config === "string") {
        payRule.config = JSON.parse(payRule.config);
      }
    }

    res.json({ data: payRule });
  } catch (error) {
    logger.error("Error fetching pay rule", error);
    res.status(500).json({ message: error.message });
  }
};