const StaffSalary = require("../../../models/primary/StaffSalary");
const Staff = require("../../../models/primary/Staff");
const SecondaryUser = require("../../../models/secondary/User");
const { Op } = require("sequelize");
const StaffPayroll = require("../../../models/primary/StaffPayroll");
const { getPaginationParams } = require("../../../utils/pagination");


// -----------------------------------------------------
// 1. GET ALL SALARIES
// ----------------------------------------------------
exports.getAllSalaries = async (req, res) => {
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

    /* --------------------------------
       PAGINATION & SORTING
    --------------------------------- */
    const {
      page,
      limit,
      offset,
      sortBy,
      sortOrder,
    } = getPaginationParams(req, [
      "salaryDate",
      "payrollMonth",
      "amount",
      "status",
      "dueDate",
      "finalDueDate",
      "createdAt",
    ]);

    const { rows: salaries, count } = await StaffSalary.findAndCountAll({
      where: whereCondition,
      limit,
      offset,
      order: [[sortBy, sortOrder]],
    });

    /* --------------------------------
       COLLECT IDS
    --------------------------------- */
    const staffIds = [];
    const counselorIds = [];

    salaries.forEach((s) => {
      if (s.type === "STAFF" && s.staffId) staffIds.push(s.staffId);
      if (s.type === "COUNSELOR" && s.counselorId)
        counselorIds.push(s.counselorId);
    });

    /* --------------------------------
       FETCH USERS IN BULK
    --------------------------------- */
    const [staffList, counselorList] = await Promise.all([
      Staff.findAll({
        where: { id: staffIds },
        attributes: ["id", "fullName", "phone", "email"],
        raw: true,
      }),
      SecondaryUser.findAll({
        where: { id: counselorIds },
        attributes: ["id", "fullname", "phone", "email"],
        raw: true,
      }),
    ]);

    const staffMap = {};
    staffList.forEach((s) => {
      staffMap[s.id] = {
        name: s.fullName,
        phone: s.phone,
        email: s.email,
      };
    });

    const counselorMap = {};
    counselorList.forEach((c) => {
      counselorMap[c.id] = {
        name: c.fullname,
        phone: c.phone,
        email: c.email,
      };
    });

    /* --------------------------------
       FINAL DATA
    --------------------------------- */
    const finalData = salaries.map((salary) => {
      let user = { name: "", phone: "", email: "" };

      if (salary.type === "STAFF") {
        user = staffMap[salary.staffId] || user;
      }

      if (salary.type === "COUNSELOR") {
        user = counselorMap[salary.counselorId] || user;
      }

      return {
        salaryId: salary.id,
        type: salary.type,
        payrollMonth: salary.payrollMonth,
        amount: salary.amount,
        status: salary.status,
        salaryDate: salary.salaryDate,
        dueDate: salary.dueDate,
        finalDueDate: salary.finalDueDate,
        user,
        staffId: salary.staffId,
        counselorId: salary.counselorId,
        assignedTo: salary.assignedTo,
        paidDate: salary.paidDate,
      };
    });

    return res.status(200).json({
      success: true,
      pagination: {
        page,
        limit,
        totalRecords: count,
        totalPages: Math.ceil(count / limit),
      },
      data: finalData,
    });
  } catch (error) {
    console.log("GET SALARY LIST ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// -----------------------------------------------------
// 4. UPDATE STATUS (Finance)
// -----------------------------------------------------
exports.updateSalaryStatus = async (req, res) => {
  try {
    const salaryId = req.params.id;
    const { status } = req.body;

    const salary = await StaffSalary.findByPk(salaryId);

    if (!salary) {
      return res.status(404).json({ message: "Salary not found" });
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
      message: "Status updated successfully",
    });
  } catch (error) {
    console.error("UPDATE STATUS ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

// -----------------------------------------------------
// 5. GENERATE PDF RECEIPT (Finance)
// -----------------------------------------------------
exports.downloadReceipt = async (req, res) => {
  try {
    const salaryId = req.params.id;

    const salary = await StaffSalary.findByPk(salaryId);

    if (!salary) {
      return res.status(404).json({ message: "Salary not found" });
    }

    //const filePath = await generateSalaryReceipt(salary);

    return res.download(`salary_receipt_${salaryId}.pdf`);
  } catch (error) {
    console.log("DOWNLOAD RECEIPT ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
/* -----------------------------------------------------
   4. UPDATE ASSIGNED_TO STATUS (Finance)
----------------------------------------------------- */
exports.assignStaffSalaries = async (req, res) => {
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
    const salaries = await StaffSalary.findAll({
      where: {
        id: { [Op.in]: salaryIds },
        assignedTo: 16,
      },
    });

    if (!salaries.length) {
      return res.status(400).json({
        message: "No eligible staff salaries found for assignment",
      });
    }

    await StaffSalary.update(
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
      message: `${salaries.length} staff salaries assigned successfully`,
      assignedCount: salaries.length,
    });
  } catch (error) {
    console.error("BULK ASSIGN STAFF SALARIES ERROR:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

/* -----------------------------------------------------
   5. GET ALL NON ASSIGNED STAFF SALARIES
----------------------------------------------------- */
exports.getNonAssignedStaffSalaries = async (req, res) => {
  try {
    const { minAmount, maxAmount, fromDate, toDate } = req.query;

    const whereCondition = {
      isDeleted: false,
      assignedTo: 16, // Fixed assignedTo filter
    };

    whereCondition.status = {
      [Op.ne]: "Pending",
    };

    /* -------------------------------
       AMOUNT RANGE FILTER
    -------------------------------- */
    if (minAmount || maxAmount) {
      whereCondition.amount = {};
      if (minAmount) whereCondition.amount[Op.gte] = Number(minAmount);
      if (maxAmount) whereCondition.amount[Op.lte] = Number(maxAmount);
    }

    /* -------------------------------
       DATE RANGE FILTER (createdAt)
    -------------------------------- */
    if (fromDate || toDate) {
      whereCondition.createdAt = {};
      if (fromDate) whereCondition.createdAt[Op.gte] = new Date(fromDate);
      if (toDate) whereCondition.createdAt[Op.lte] = new Date(toDate);
    }

    const salaries = await StaffSalary.findAll({
      where: whereCondition,
      order: [["createdAt", "DESC"]],
      include: [
        {
          model: StaffPayroll,
          as: "payroll", // assuming staff has a payroll association
        },
      ],
    });

    const finalData = [];

    for (let salary of salaries) {
      let staffDetails = null;
      if (salary.staffId || salary.counselorId) {
        if (salary.type === "STAFF") {
          const staff = await Staff.findOne({
            where: { id: salary.staffId },
            attributes: ["fullName", "phone", "email"],
          });

          staffDetails = staff
            ? {
                name: staff.fullName,
                phone: staff.phone,
                email: staff.email,
              }
            : null;
        } else if (salary.type === "COUNSELOR") {
          const counsellor = await SecondaryUser.findOne({
            where: { id: salary.counselorId },
            attributes: ["fullname", "phone", "email"],
          });

          staffDetails = counsellor
            ? {
                name: counsellor.fullname,
                phone: counsellor.phone,
                email: counsellor.email,
              }
            : null;
        }
      }

      finalData.push({
        salaryId: salary.id,
        payrollMonth: salary.payrollMonth,
        amount: salary.amount,
        status: salary.status,
        createdAt: salary.createdAt,
        assignedTo: salary.assignedTo,
        staffId: salary.staffId,
        salaryDate: salary.salaryDate,
        dueDate: salary.dueDate,
        finalDueDate: salary.finalDueDate,
        user: staffDetails || { name: "", phone: "", email: "" },
        payroll: salary.payroll
          ? {
              baseSalary: salary.payroll.baseSalary,
              grossSalary: salary.payroll.grossSalary,
              netSalary: salary.payroll.netSalary,
              totalWorkingDays: salary.payroll.totalWorkingDays,
              attendedDays: salary.payroll.attendedDays,
              missedDays: salary.payroll.missedDays,
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
    console.log("GET ASSIGNED STAFF SALARY ERROR:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};
