const TutorSalary = require("../../../models/primary/TutorSalary");
const TutorPayroll = require("../../../models/primary/TutorPayroll");
const SecondaryUser = require("../../../models/secondary/User");
const { Op } = require("sequelize");

// const { generateSalaryReceipt } = require("../utils/pdfGenerator");

/* -----------------------------------------------------
   1. GET ALL TUTOR SALARIES
----------------------------------------------------- */
exports.getAllTutorSalaries = async (req, res) => {
  try {
    const whereCondition = { isDeleted: false };

    /* --------------------------------
       DEPARTMENT BASED STATUS FILTER
    --------------------------------- */
    if (req.user?.department === "HR") {
      whereCondition.status = "Pending";
    }

    if (req.user?.department === "Finance") {
      whereCondition.status = {
        [Op.ne]: "Pending",
      };
    }

    const salaries = await TutorSalary.findAll({
      where: whereCondition,
      order: [["salaryDate", "DESC"]],
      include: [
        {
          model: TutorPayroll,
          as: "payroll",
        },
      ],
    });

    const finalData = [];

    for (let salary of salaries) {
      let tutorDetails = null;

      if (salary.tutorId) {
        const tutor = await SecondaryUser.findOne({
          where: { id: salary.tutorId },
          attributes: ["fullname", "phone", "email"],
        });

        tutorDetails = tutor
          ? {
              name: tutor.fullname,
              phone: tutor.phone,
              email: tutor.email,
            }
          : null;
      }

      finalData.push({
        salaryId: salary.id,
        type: "TUTOR",
        payrollMonth: salary.payrollMonth,
        amount: salary.amount,
        status: salary.status,
        salaryDate: salary.salaryDate,
        dueDate: salary.dueDate,
        finalDueDate: salary.finalDueDate,
        assignedTo: salary.assignedTo,
        paidDate: salary.paidDate,

        tutorId: salary.tutorId,
        user: tutorDetails || { name: "", phone: "", email: "" },

        payroll: salary.payroll
          ? {
              totalClasses: salary.payroll.totalClasses,
              attendedClasses: salary.payroll.attendedClasses,
              missedClasses: salary.payroll.missedClasses,
              baseSalary: salary.payroll.baseSalary,
              grossSalary: salary.payroll.grossSalary,
              netSalary: salary.payroll.netSalary,
            }
          : null,
      });
    }

    return res.status(200).json({
      success: true,
      count: finalData.length,
      data: finalData,
    });
  } catch (error) {
    console.log("GET TUTOR SALARY LIST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

/* -----------------------------------------------------
   2. UPDATE SALARY STATUS (Finance)
----------------------------------------------------- */
exports.updateTutorSalaryStatus = async (req, res) => {
  try {
    const salaryId = req.params.id;
    const { status } = req.body;

    const salary = await TutorSalary.findByPk(salaryId);

    if (!salary) {
      return res.status(404).json({ message: "Tutor salary not found" });
    }

    salary.status = status;
    salary.updatedBy = req.user?.id || null;

    // ✅ set paidDate only when status = Paid
    if (status === "Paid") {
      salary.paidDate = new Date();
    }

    // Optional: clear paidDate if status changes from Paid
    if (status !== "Paid") {
      salary.paidDate = null;
    }

    await salary.save();

    res.status(200).json({
      success: true,
      message: "Tutor salary status updated",
    });
  } catch (error) {
    console.log("UPDATE TUTOR SALARY STATUS ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* -----------------------------------------------------
   3. GENERATE / DOWNLOAD SALARY RECEIPT (Finance)
----------------------------------------------------- */
exports.downloadTutorSalaryReceipt = async (req, res) => {
  try {
    const salaryId = req.params.id;

    const salary = await TutorSalary.findByPk(salaryId, {
      include: [
        {
          model: TutorPayroll,
          as: "payroll",
        },
      ],
    });

    if (!salary) {
      return res.status(404).json({ message: "Tutor salary not found" });
    }

    /* 
      🔹 PDF generation hook (future)
      const filePath = await generateSalaryReceipt({
        salary,
        payroll: salary.payroll,
        tutorId: salary.tutorId,
      });
      return res.download(filePath);
    */

    // Temporary response until PDF is added
    return res.status(200).json({
      success: true,
      message: "Salary receipt ready",
      data: {
        receiptNo: `TUTOR-SAL-${salary.id}`,
        tutorId: salary.tutorId,
        payrollMonth: salary.payrollMonth,
        amount: salary.amount,
        status: salary.status,

        breakdown: salary.payroll
          ? {
              baseSalary: salary.payroll.baseSalary,
              earnings: salary.payroll.earnings,
              deductions: salary.payroll.deductions,
              grossSalary: salary.payroll.grossSalary,
              netSalary: salary.payroll.netSalary,
            }
          : null,

        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.log("DOWNLOAD TUTOR RECEIPT ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

/* -----------------------------------------------------
   4. UPDATE ASSIGNED_TO STATUS (Finance)
----------------------------------------------------- */
exports.assignTutorSalaries = async (req, res) => {
  try {
    const { salaryIds, assignedTo } = req.body;

    if (!Array.isArray(salaryIds) || salaryIds.length === 0) {
      return res.status(400).json({
        message: "salaryIds must be a non-empty array",
      });
    }

    if (!assignedTo) {
      return res.status(400).json({
        message: "assignId is required",
      });
    }

    // fetch only unassigned salaries
    const salaries = await TutorSalary.findAll({
      where: {
        id: { [Op.in]: salaryIds },
        assignedTo: 16,
      },
    });

    if (!salaries.length) {
      return res.status(400).json({
        message: "No eligible tutor salaries found for assignment",
      });
    }

    await TutorSalary.update(
      {
        assignedTo,
        assignDate: new Date(),
        updatedBy: req.user?.id || null,
      },
      {
        where: {
          id: { [Op.in]: salaries.map((s) => s.id) },
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: `${salaries.length} tutor salaries assigned successfully`,
      assignedCount: salaries.length,
    });
  } catch (error) {
    console.error("BULK ASSIGN TUTOR SALARIES ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* -----------------------------------------------------
   5. GET ALL NON ASSIGNED TUTOR SALARIES
----------------------------------------------------- */
exports.getNonAssignedTutorSalaries = async (req, res) => {
  try {
    const { minAmount, maxAmount, fromDate, toDate } = req.query;

    const whereCondition = {
      isDeleted: false,
      assignedTo: 16, // 👈 FIXED assignedTo filter
    };

    whereCondition.status = {
      [Op.ne]: "Pending",
    };

    /* -------------------------------
       AMOUNT RANGE FILTER
    -------------------------------- */
    if (minAmount || maxAmount) {
      whereCondition.amount = {};

      if (minAmount) {
        whereCondition.amount[Op.gte] = Number(minAmount);
      }

      if (maxAmount) {
        whereCondition.amount[Op.lte] = Number(maxAmount);
      }
    }

    /* -------------------------------
       DATE RANGE FILTER (createdAt)
    -------------------------------- */
    if (fromDate || toDate) {
      whereCondition.createdAt = {};

      if (fromDate) {
        whereCondition.createdAt[Op.gte] = new Date(fromDate);
      }

      if (toDate) {
        whereCondition.createdAt[Op.lte] = new Date(toDate);
      }
    }

    const salaries = await TutorSalary.findAll({
      where: whereCondition,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: TutorPayroll,
          as: "payroll",
        },
      ],
    });

    const finalData = [];

    for (let salary of salaries) {
      let tutorDetails = null;

      if (salary.tutorId) {
        const tutor = await SecondaryUser.findOne({
          where: { id: salary.tutorId },
          attributes: ["fullname", "phone", "email"],
        });

        tutorDetails = tutor
          ? {
              name: tutor.fullname,
              phone: tutor.phone,
              email: tutor.email,
            }
          : null;
      }

      finalData.push({
        salaryId: salary.id,
        payrollMonth: salary.payrollMonth,
        amount: salary.amount,
        status: salary.status,
        createdAt: salary.createdAt,
        assignedTo: salary.assignedTo,
        tutorId: salary.tutorId,
        salaryDate: salary.salaryDate,
        dueDate: salary.dueDate,
        finalDueDate: salary.finalDueDate,
        user: tutorDetails || { name: "", phone: "", email: "" },
        payroll: salary.payroll
          ? {
              totalClasses: salary.payroll.totalClasses,
              attendedClasses: salary.payroll.attendedClasses,
              missedClasses: salary.payroll.missedClasses,
              baseSalary: salary.payroll.baseSalary,
              grossSalary: salary.payroll.grossSalary,
              netSalary: salary.payroll.netSalary,
            }
          : null,
      });
    }

    return res.status(200).json({
      success: true,
      count: finalData.length,
      data: finalData,
    });
  } catch (error) {
    console.log("GET ASSIGNED TUTOR SALARY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
