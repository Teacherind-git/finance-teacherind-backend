require("dotenv").config();
const moment = require("moment");
const StudentBill = require("../../models/primary/StudentBill");

async function updateBillStatus() {
  const today = moment().startOf("day");

  // Normal overdue
  const overdueBills = await StudentBill.findAll({
    where: {
      status: "Generated",
      dueDate: { [Op.lt]: today.toDate() },
    },
  });

  for (const bill of overdueBills) {
    bill.status = "On Due";
    await bill.save();
  }

  // Final overdue
  const finalOverdueBills = await Bill.findAll({
    where: {
      status: { [Op.ne]: "Paid" },
      finalDueDate: { [Op.lt]: today.toDate() },
    },
  });

  for (const bill of finalOverdueBills) {
    bill.status = "Overdue";
    await bill.save();
  }

  console.log("✔ Bill status update completed.");
  process.exit(0);
}

updateBillStatus();
