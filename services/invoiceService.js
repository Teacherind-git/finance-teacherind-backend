// services/invoice.service.js
exports.getInvoiceData = async (studentId) => {
  // Replace with real DB query
  return {
    invoiceNo: 765,
    invoiceDate: "01/12/2025",
    dueDate: "04/12/2025",

    company: {
      name: "teacherInd Loro Talento Pvt Ltd",
      address:
        "teacherInd Tower, Pulpatta (PO), Malappuram, Kerala, 673641",
      phone: "7907361068",
      email: "teacherindedu@gmail.com",
      pan: "AALCT6766C",
      website: "www.teacherind.com",
    },

    student: {
      name: "V GEETHIKA",
      mobile: "7152176057",
    },

    items: [
      {
        name: "JT SHINE UP HINDI",
        sac: "999299",
        qty: "3 MON",
        rate: 2399,
        discount: 143.94,
        amount: 7053.06,
      },
      {
        name: "JT SHINE UP MATHEMATICS",
        sac: "999299",
        qty: "3 MON",
        rate: 2399,
        discount: 143.94,
        amount: 7053.06,
      },
    ],

    subtotal: 14106.12,
    receivedAmount: 0,
    totalWords:
      "Fourteen Thousand One Hundred Six Rupees and Twelve Paise",

    bank: {
      name: "teacherInd Loro Talento Pvt Ltd",
      account: "25150200002750",
      ifsc: "FDRL0002515",
      branch: "Federal Bank, Kizhissery",
    },
  };
};
