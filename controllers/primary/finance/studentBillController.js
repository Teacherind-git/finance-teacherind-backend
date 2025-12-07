const StudentBill = require("../../../models/primary/StudentBill");
const Student = require("../../../models/primary/Student");
const StudentDetail = require("../../../models/primary/StudentDetail");
const ClassRange = require("../../../models/primary/ClassRange");
const Subject = require("../../../models/primary/Subject");
const Package = require("../../../models/primary/Package");
const logger = require("../../../utils/logger");

exports.getStudentBills = async (req, res) => {
  try {
    const { studentId, status } = req.query;

    logger.info("Get student bills API called", {
      studentId,
      status,
      requestedBy: req.user?.id || "anonymous",
    });

    const where = {};
    if (studentId) where.studentId = studentId;
    if (status) where.status = status;

    logger.debug("Student bill query filters", where);

    const bills = await StudentBill.findAll({
      where,
      include: [
        {
          model: Student,
          attributes: ["id", "name", "contact", "status"],
          include: [
            {
              model: StudentDetail,
              as: "details",
              attributes: [
                "id",
                "packagePrice",
                "discount",
                "totalPrice",
                "startDate",
              ],
              include: [
                {
                  model: ClassRange,
                  as: "class_range",
                  attributes: ["id", "label"],
                },
                { model: Subject, as: "subject", attributes: ["id", "name"] },
                { model: Package, as: "package", attributes: ["id", "name"] },
              ],
            },
          ],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    if (!bills.length) {
      logger.warn("No student bills found", where);
    }

    logger.info("Student bills fetched successfully", {
      count: bills.length,
    });

    res.status(200).json({
      success: true,
      count: bills.length,
      bills,
    });
  } catch (error) {
    logger.error("Get Student Bills Error", error);

    res.status(500).json({
      success: false,
      message: "Failed to fetch student bills",
    });
  }
};
