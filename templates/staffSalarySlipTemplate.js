// templates/salarySlipTemplate.js
module.exports = (data) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <style>
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #000;
      margin: 20px;
    }

    .container {
      border: 2px solid #000;
      padding: 20px;
    }

    .header {
      display: flex;
      align-items: center;
      gap: 15px;
    }

    .logo img {
      width: 80px;
    }

    .company-details {
      flex: 1;
    }

    .company-name {
      font-size: 20px;
      font-weight: bold;
      color: #c40000;
    }

    .title {
      text-align: center;
      font-size: 18px;
      font-weight: bold;
      margin: 20px 0;
    }

    .info p {
      margin: 4px 0;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }

    th, td {
      border: 1px solid #000;
      padding: 6px;
    }

    th {
      background: #f0f0f0;
      text-align: center;
    }

    .right {
      text-align: right;
    }

    .signature {
      margin-top: 50px;
      text-align: right;
    }

    .gst-box {
      margin-top: 20px;
      border: 1px solid #000;
      padding: 10px;
    }
  </style>
</head>

<body>
  <div class="container">
    <div class="header">
      <div class="logo">
        <img src="http://localhost:5000/public/logo/logo.png" />
      </div>
      <div class="company-details">
        <div class="company-name">teacherInd Loro Talento Pvt Ltd.</div>
        <div>teacherInd Tower, pulpatta (po), Malappuram, Kerala, 673641</div>
        <div>Mobile: 7907361068 &nbsp;&nbsp; PAN: AALCT6766C</div>
        <div>Email: teacherindedu@gmail.com</div>
        <div>Website: www.teacherind.com</div>
      </div>
    </div>

    <div class="title">Salary Slip</div>

    <div class="info">
      <p><strong>Pay Period:</strong> ${data.payPeriod}</p>
      <p><strong>Pay Date:</strong> ${data.payDate}</p>
      <p><strong>Employee Name:</strong> ${data.employeeName}</p>
      <p><strong>Employee ID:</strong> ${data.employeeId}</p>
      <p><strong>Position:</strong> ${data.position}</p>
    </div>

    <table>
      <tr>
        <th>Earnings</th>
        <th>Amount</th>
        <th>Deductions</th>
        <th>Amount</th>
      </tr>

      <tr>
        <td>Month</td>
        <td>${data.month}</td>
        <td> Deduction</td>
        <td class="right">${data.totalDeductions}</td>
      </tr>

      <tr>
        <td>Base Salary</td>
        <td class="right">${data.baseSalary}</td>
        <td></td>
        <td></td>
      </tr>

      <tr>
        <td>Bonus</td>
        <td class="right">${data.bonus}</td>
        <td></td>
        <td></td>
      </tr>

      <tr>
        <th>Gross Salary</th>
        <th class="right">${data.grossSalary}</th>
        <th>Total Deductions</th>
        <th class="right">${data.totalDeductions}</th>
      </tr>
    </table>

    <!-- GST SECTION -->
    <div class="gst-box">
      <p><strong>GST Details</strong></p>
      <p>GST %: ${data.gstPercent}%</p>
      <p>GST Amount: ₹ ${data.gstAmount}</p>
    </div>

    <table>
      <tr>
        <th>Net Pay</th>
        <th class="right">₹ ${data.netPay}</th>
      </tr>
    </table>

    <div class="signature">
      <p><strong>Authorised Signatory</strong></p>
      <p>teacherInd Loro Talento Pvt Ltd.</p>
    </div>
  </div>
</body>
</html>
`;
