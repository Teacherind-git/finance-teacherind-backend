const StaffSalary = require("../../../models/primary/StaffSalary");
const Staff = require("../../../models/primary/Staff");
const SecondaryUser = require("../../../models/secondary/User");
const { Op } = require("sequelize");

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

    const salaries = await StaffSalary.findAll({
      where: whereCondition,
      order: [["salaryDate", "DESC"]],
    });

    const finalData = [];

    for (let salary of salaries) {
      let userDetails = null;

      if (salary.type === "STAFF" && salary.staffId) {
        const staff = await Staff.findOne({
          where: { id: salary.staffId },
          attributes: ["fullName", "phone", "email"],
        });

        userDetails = staff
          ? {
              name: staff.fullName,
              phone: staff.phone,
              email: staff.email,
            }
          : null;
      }

      if (salary.type === "COUNSELOR" && salary.counselorId) {
        const counselor = await SecondaryUser.findOne({
          where: { id: salary.counselorId },
          attributes: ["fullname", "phone", "email"],
        });

        userDetails = counselor
          ? {
              name: counselor.fullname,
              phone: counselor.phone,
              email: counselor.email,
            }
          : null;
      }

      finalData.push({
        salaryId: salary.id,
        type: salary.type,
        payrollMonth: salary.payrollMonth,
        amount: salary.amount,
        status: salary.status,
        salaryDate: salary.salaryDate,
        dueDate: salary.dueDate,
        finalDueDate: salary.finalDueDate,
        user: userDetails || { name: "", phone: "", email: "" },
        staffId: salary.staffId,
        counselorId: salary.counselorId,
      });
    }

    return res.status(200).json({
      success: true,
      count: finalData.length,
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

    await salary.save();

    res.status(200).json({
      success: true,
      message: "Status updated",
    });
  } catch (error) {
    console.log("UPDATE STATUS ERROR:", error);
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

    return res.download( `salary_receipt_${salaryId}.pdf`);
  } catch (error) {
    console.log("DOWNLOAD RECEIPT ERROR:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};
